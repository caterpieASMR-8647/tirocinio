import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { EffectComposer, OrbitControls, RenderPass, SceneUtils, ShaderPass, ThreeMFLoader } from 'three/examples/jsm/Addons.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { InteractionManager } from '../node_modules/THREE.Interactive-1.8.0/build/three.interactive'
import { OutlinePass } from 'three/examples/jsm/Addons.js';
import { FXAAShader } from 'three/examples/jsm/Addons.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { computeMorphedAttributes } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { element, getParallaxCorrectNormal } from 'three/tsl';
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js';
import { AlwaysStencilFunc, Group, Vector3, Vector4 } from 'three/webgpu';

// ########################################### Classes ########################################### //



// ########################################## Elements ########################################### //

let changeModeButton = document.getElementById("transformState");
changeModeButton.addEventListener( 'click', (e) => {
    e.target.blur();
    transformState();
} );

// ########################################### Renderer ########################################## //

const renderer = new THREE.WebGLRenderer( {canvas: unCanvas , antialias : true});
document.body.appendChild( renderer.domElement );

// ############################################ Scene ############################################ //

// Grids
const scene = new THREE.Scene();
scene.add( new THREE.AxesHelper(5) );
var bottomGrid = new THREE.GridHelper( 10, 20, 0x888888, 0x444444 );
bottomGrid.position.y += -5;
var topGrid = new THREE.GridHelper( 10, 20, 0x888888, 0x444444 );
topGrid.position.y += 5;
var frontGrid = new THREE.GridHelper( 10, 20, 0x888888, 0x444444 );
frontGrid.rotation.x = Math.PI * 0.5;
frontGrid.position.z += -5;
var leftGrid = new THREE.GridHelper( 10, 20, 0x888888, 0x444444 );
leftGrid.rotation.x = Math.PI * 0.5;
leftGrid.rotation.z = Math.PI * 0.5;
leftGrid.position.x += -5;
var rightGrid = new THREE.GridHelper( 10, 20, 0x888888, 0x444444 );
rightGrid.rotation.x = Math.PI * 0.5;
rightGrid.rotation.z = Math.PI * 0.5;
rightGrid.position.x += 5;
scene.add( bottomGrid, topGrid, frontGrid, leftGrid, rightGrid );

const light = new THREE.PointLight(0xffffff, 50);
light.position.set(0.8, 1.4, 1.0);
scene.add(light);
const ambientLight = new THREE.AmbientLight();
scene.add(ambientLight);

// ########################################### Cameras ########################################### //
let aspect = window.innerWidth / window.innerHeight;
const frustumSize = 5;

const cameraPersp = new THREE.PerspectiveCamera(
    75,
    aspect,
    0.1,
    1000
);

/* I Never Change 1000, which is the far plane, so if perspective camera is very distant 
from object, on perspective change, orthographic camera could be fully black */
const cameraOrtho = new THREE.OrthographicCamera(
    -frustumSize * aspect,
    frustumSize * aspect,
    frustumSize,
    - frustumSize,
    0.1,
    1000
);

cameraPersp.position.set(0, 0, 2);
cameraOrtho.position.set(0, 0, 2);
cameraOrtho.zoom = 3.3;
let currentCamera = cameraPersp;

// ############################################# GUI ############################################# //

const orbit = new OrbitControls( currentCamera, renderer.domElement );
orbit.enableDamping = true;
orbit.target.set(0, 0, 0);
orbit.update();
orbit.addEventListener( 'change', render );

let control1 = new TransformControls( currentCamera, renderer.domElement );
control1.showX = control1.showY = control1.showZ = false;
control1.addEventListener( 'change', render );
control1.addEventListener( 'dragging-changed', function (event) {
    orbit.enabled = ! event.value;
} );

let control2 = new TransformControls( currentCamera, renderer.domElement );
control2.showX = control2.showY = control2.showZ = false;
control2.addEventListener( 'change', render );
control2.addEventListener( 'dragging-changed', function (event) {
    orbit.enabled = ! event.value;
} );

// Defaults to NO

let showGizmo = false;

// ####################################### Hover and Click ####################################### //

const interactionManager = new InteractionManager(
    renderer,
    currentCamera,
    renderer.domElement
);

// ########################################### Outline ########################################### //

//Outline for Perspective Camera
const composerPersp = new EffectComposer( renderer );
const renderPassPersp = new RenderPass( scene, currentCamera );
const gammaCorrectionPass = new ShaderPass( GammaCorrectionShader );

composerPersp.addPass( renderPassPersp );
composerPersp.addPass( gammaCorrectionPass );

const outlinePersp = new OutlinePass( new THREE.Vector2(1200, 800), scene, currentCamera );
outlinePersp.edgeThickness = 0.5;
outlinePersp.edgeStrength = 3.0;
outlinePersp.visibleEdgeColor.set( 0xffffff );

composerPersp.addPass( outlinePersp );

//Outline for Orthographic Camera
const composerOrtho = new EffectComposer( renderer );
const renderPassOrtho = new RenderPass( scene, cameraOrtho );

composerOrtho.addPass( renderPassOrtho );
composerOrtho.addPass( gammaCorrectionPass );

const outlineOrtho = new OutlinePass( new THREE.Vector2(1200, 800), scene, cameraOrtho );
outlineOrtho.edgeThickness = 0.5;
outlineOrtho.edgeStrength = 3.0;
outlineOrtho.visibleEdgeColor.set( 0xffffff );

composerOrtho.addPass( outlineOrtho );

const textureLoader = new THREE.TextureLoader();
textureLoader.load("../three.js-master/examples/textures/tri_pattern.jpg", function(texture){
    if (texture) {
        outlinePersp.patternTexture = texture;
        outlineOrtho.patternTexture = texture;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
    }   
});

const fxaaShader = new ShaderPass( FXAAShader );
fxaaShader.uniforms["resolution"].value.set( 1/1200, 1/800 );
composerPersp.addPass( fxaaShader );
composerOrtho.addPass( fxaaShader );

let currentComposer = composerPersp;

onWindowResize();

// ############################################ Funcs ############################################ //

let myMesh1 = new THREE.Group(), myMesh2 = new THREE.Group();
let hovering = false;

// Creates 2 Meshes with proper TransformControls, Origin and EventListeners
function createInitialMeshes(  ) {

    // let myMesh1 = new THREE.Group();
    // let myMesh2 = new THREE.Group();

    //Loader for FBX Meshes + adds Events for mouse hover
    const loader = new FBXLoader();
    loader.load('../../../../../meshes/J10B-TSF.fbx',
        ( mesh ) => {
            // mesh.traverse(function (child) {
            //     if (child.isMesh) {
            //         (child).material = material;
            //         if (child.material) {
            //             child.material.transparent = false;
            //         }
            //     }
            // })
            
            mesh.scale.set( .001, .001, .001 );
            const box = new THREE.Box3().setFromObject( mesh );
            const center = new THREE.Vector3();
            box.getCenter( center );
            
            // Translates Mesh so that its Mass Center is in the Center of the Group
            mesh.position.sub( center );

            mesh.scale.set( .001, .001, .001 );
            myMesh1.add( mesh );
            
            myMesh1.position.set( -1 , 0, 0 );
        
            myMesh1.addEventListener('mouseover', (event) => {
                if ( isAnimationMode ) return;

                let selectedObjects = [];
                selectedObjects[0] = event.target;
                outlinePersp.selectedObjects = selectedObjects;
                outlineOrtho.selectedObjects = selectedObjects;
                document.body.style.cursor = 'pointer';
                hovering = 1;
            });
            myMesh1.addEventListener('mouseout', (event) => {
                if ( isAnimationMode ) return;

                outlinePersp.selectedObjects = [];
                outlineOrtho.selectedObjects = [];
                document.body.style.cursor = 'default';
                hovering = 0;
            }); 
            myMesh1.addEventListener('mousedown', (event) => {
                if (hovering && ! control1.enabled) {
                    control1.pointerDown( control1._getPointer( event ) );
                    control1.pointerMove( control1._getPointer( event ) );
                }
            });
            myMesh1.addEventListener('mouseup', (event) => {
                control1.pointerUp( control1._getPointer( event ) );
            });

            interactionManager.add( myMesh1 );
            scene.add( myMesh1 );
            control1.attach( myMesh1 );

            myMesh2 = myMesh1.clone();
            myMesh2.position.set( 1 , 0, 0 );

            myMesh2.addEventListener('mouseover', (event) => {
                if ( isAnimationMode ) return;

                let selectedObjects = [];
                selectedObjects[0] = event.target;
                outlinePersp.selectedObjects = selectedObjects;
                outlineOrtho.selectedObjects = selectedObjects;
                document.body.style.cursor = 'pointer';
                hovering = 2;
            });
            myMesh2.addEventListener('mouseout', (event) => {
                if ( isAnimationMode ) return;

                outlinePersp.selectedObjects = [];
                outlineOrtho.selectedObjects = [];
                document.body.style.cursor = 'default';
                hovering = 0;
            }); 
            myMesh2.addEventListener('mousedown', (event) => {
                if (hovering && ! control2.enabled) {
                    control2.pointerDown( control2._getPointer( event ) );
                    control2.pointerMove( control2._getPointer( event ) );
                }
            });
            myMesh2.addEventListener('mouseup', (event) => {
                control2.pointerUp( control2._getPointer( event ) );
            });

            interactionManager.add( myMesh2 );
            scene.add( myMesh2 );
            control2.attach( myMesh2 );

            if (myMesh1 && myMesh2) createAnimationMesh(  );

            render();
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
        },
        (error) => {
            console.log(error);
        }
    )
    // After Adding Mesh to TransformControls, adds TransformControl to Scene (Gizmo)
    scene.add( control1.getHelper() );
    scene.add( control2.getHelper() );
}

function createAnimationMesh() {
    // Define start and end meshes
    startMesh = myMesh1;
    endMesh = myMesh2;

    // Saves Original Transforms for Mesh1 and 2 - I do it now to be sure they are properly set
    myMesh1.userData.original = {
        position : myMesh1.position.clone(),
        rotation : myMesh1.rotation.clone(),
        scale    : myMesh1.scale.clone()
    };

    myMesh2.userData.original = {
        position : myMesh2.position.clone(),
        rotation : myMesh2.rotation.clone(),
        scale    : myMesh2.scale.clone()
    };

    // Create a deep clone of the starting mesh
    animationMesh = startMesh.clone();

    // Clean and prepare all mesh materials and data
    animationMesh.traverse( ( child ) => {
        if ( child.isMesh ) {
            // Remove user data to prevent unwanted inheritance
            child.userData = {};

            // Safely clone the material
            if ( child.material && typeof child.material.clone === "function" ) {
                child.material = child.material.clone();
                child.material.transparent = false;
                child.material.opacity = 1.0;
                child.material.depthWrite = true;
            }
        }
    });

    animationMesh.position.copy( myMesh1.position );

    // Remove possible event listeners from the clone
    animationMesh.children.forEach( ( child ) => {
        if ( child.removeEventListener ) {
            child.removeEventListener( "mouseover", () => {} );
            child.removeEventListener( "mouseout", () => {} );
            child.removeEventListener( "mousedown", () => {} );
            child.removeEventListener( "mouseup", () => {} );
        }
    });

    // Place animation mesh at the scene center
    animationMesh.visible = false;

    // Add the mesh to the scene
    scene.add( animationMesh );

    console.log( "Animation mesh created:", animationMesh );
}

// Start Hitchcock Effect
let isTransitioning = false;
let transitionProgress = 0;
const transitionDuration = 0.25; // seconds

// Linearly Interpolates 2 Values
function lerp( start, end, t ) {
    return start + ( end - start ) * t;
}

// Eases Transition for better Smoothness
function easeInOutCubic( t ) {
    return t < 0.5 
        ? 4 * t * t * t 
        : 1 - Math.pow( -2 * t + 2, 3 ) / 2;
}

// Animates Camera Transition with Hitchcock Effect
function animateCameraTransition( fromCamera, toCamera, duration, onComplete ) {
    if (isTransitioning) return;
    
    isTransitioning = true;
    transitionProgress = 0;
    
    const startPosition = fromCamera.position.clone();
    const distance = startPosition.distanceTo(orbit.target);
    const direction = startPosition.clone().sub(orbit.target).normalize();
    
    const orbitWasEnabled = orbit.enabled;
    orbit.enabled = false;
    
    const startTime = performance.now();
    
    let startFov, targetFov, startDistance, targetDistance;
    let visibleHeight;
    
    if (toCamera.isOrthographicCamera) {
        // Perspective → Orthographic
        startFov = fromCamera.fov;
        targetFov = 2;
        
        const startVFov = THREE.MathUtils.degToRad(startFov);
        visibleHeight = 2 * Math.tan(startVFov / 2) * distance;
        
        startDistance = distance;
        
        const targetVFov = THREE.MathUtils.degToRad(targetFov);
        targetDistance = visibleHeight / (2 * Math.tan(targetVFov / 2));
        
        const orthoHeight = frustumSize * 2;
        const finalZoom = orthoHeight / visibleHeight;
        
        toCamera.zoom = finalZoom;
        toCamera.position.copy(
            orbit.target.clone().add(direction.clone().multiplyScalar(targetDistance))
        );
        toCamera.updateProjectionMatrix();
        
        console.log("Persp->Ortho (Hitchcock)");
        console.log("Visible Height:", visibleHeight);
        
    } else {
        // Orthographic → Perspective
        visibleHeight = (frustumSize * 2) / fromCamera.zoom;
        
        startFov = 2;
        targetFov = 75;
        
        const startVFov = THREE.MathUtils.degToRad(startFov);
        startDistance = visibleHeight / (2 * Math.tan(startVFov / 2));
        
        const targetVFov = THREE.MathUtils.degToRad(targetFov);
        targetDistance = visibleHeight / (2 * Math.tan(targetVFov / 2));
        
        toCamera.zoom = 1;
        toCamera.fov = startFov;
        toCamera.position.copy(
            orbit.target.clone().add(direction.clone().multiplyScalar(startDistance))
        );
        toCamera.updateProjectionMatrix();
        
        console.log("Ortho->Persp (Hitchcock)");
        console.log("Visible Height:", visibleHeight);
    }
    
    function updateTransition() {
        const currentTime = performance.now();
        const elapsed = (currentTime - startTime) / 1000;
        transitionProgress = Math.min(elapsed / duration, 1);

        const easedProgress = easeInOutCubic(transitionProgress);
        const currentFov = lerp(startFov, targetFov, easedProgress);

        let currentDistance;

        if (toCamera.isPerspectiveCamera) {
            // Orthographic → Perspective
            toCamera.fov = currentFov;
            const currentVFov = THREE.MathUtils.degToRad(currentFov);
            currentDistance = visibleHeight / (2 * Math.tan(currentVFov / 2));

            const newPosition = orbit.target.clone().add(
                direction.clone().multiplyScalar(currentDistance)
            );
            toCamera.position.copy(newPosition);
            toCamera.updateProjectionMatrix();
            toCamera.lookAt(orbit.target);

        } else {
            // Perspective → Orthographic
            fromCamera.fov = currentFov;
            const currentVFov = THREE.MathUtils.degToRad(currentFov);
            currentDistance = visibleHeight / (2 * Math.tan(currentVFov / 2));

            const newPosition = orbit.target.clone().add(
                direction.clone().multiplyScalar(currentDistance)
            );
            fromCamera.position.copy(newPosition);
            fromCamera.updateProjectionMatrix();
            fromCamera.lookAt(orbit.target);

            toCamera.position.copy(newPosition);
            toCamera.lookAt(orbit.target);
        }

        render();

        if (transitionProgress < 1) {
            requestAnimationFrame(updateTransition);
        } else {
            isTransitioning = false;
            orbit.enabled = orbitWasEnabled;
            if (onComplete) onComplete();
            render();
        }
    }

    updateTransition();
}

// Changes Camera Perspective
function changeCamera(  ) {
    if ( isTransitioning ) return; // Prevents Multiple Transitions

    const oldCamera = currentCamera;
    
    // Determines New Camera ( does not change it yet )
    const newCamera = currentCamera.isPerspectiveCamera ? cameraOrtho : cameraPersp;
    const newComposer = currentCamera.isPerspectiveCamera ? composerOrtho : composerPersp;
    
    if ( currentCamera.isOrthographicCamera ) {
        currentCamera = newCamera;
        currentComposer = newComposer;
    }

    // Starts Animation with Callback
    animateCameraTransition( oldCamera, newCamera, transitionDuration, () => {
        if ( currentCamera.isPerspectiveCamera ) {
            currentCamera = newCamera;
            currentComposer = newComposer;
        }
        
        // Updates Controls AFTER Animation
        orbit.object = currentCamera;
        control1.camera = currentCamera;
        control2.camera = currentCamera;
        interactionManager.camera = currentCamera;
        
        console.log( "Transizione completata - Persp: ", cameraPersp.zoom, "~ Ortho: ", cameraOrtho.zoom );
    });
}

// Transitions Camera from starting point to a final position, sets orbit.target = ( 0, 0, 0 )
function smoothCameraTransition ( finalPosition ) {

    if ( isTransitioning || currentCamera.position == finalPosition ) return;
    isTransitioning = true;

    const duration = 0.75;
    const startTime = performance.now();

    const startPos = currentCamera.position.clone();
    const startTarget = orbit.target.clone();

    const endTarget = new THREE.Vector3( 0, 0, 0 );
    const endPos = finalPosition.clone();

    const startOffset = startPos.clone().sub( startTarget );
    const endOffset   = endPos.clone().sub( endTarget );

    const startSph = new THREE.Spherical().setFromVector3( startOffset );
    const endSph   = new THREE.Spherical().setFromVector3( endOffset );

    const EPS = 0.0001;
    startSph.phi = THREE.MathUtils.clamp( startSph.phi, EPS, Math.PI - EPS );
    endSph.phi   = THREE.MathUtils.clamp( endSph.phi,   EPS, Math.PI - EPS );

    const startZoom = currentCamera.zoom;

    const endZoom = ( endPos.x === 0 ) ? 3.258063432103014 : 2.1720422880686763;

    function update() {

        const now  = performance.now();
        const t    = Math.min( ( now - startTime ) / ( duration * 1000 ), 1 );
        const eased = easeInOutCubic( t );

        const sph = new THREE.Spherical();
        sph.radius = THREE.MathUtils.lerp( startSph.radius, endSph.radius, eased );
        sph.theta  = THREE.MathUtils.lerp( startSph.theta,  endSph.theta,  eased );
        sph.phi    = THREE.MathUtils.lerp( startSph.phi,    endSph.phi,    eased );

        const target = startTarget.clone().lerp( endTarget, eased );

        const offset = new THREE.Vector3().setFromSpherical( sph );
        const pos    = target.clone().add( offset );

        currentCamera.position.copy( pos );
        orbit.target.copy( target );

        // Apply proper zoom/distance depending on camera type
        if ( currentCamera.isOrthographicCamera ) {
            currentCamera.zoom = THREE.MathUtils.lerp( startZoom, endZoom, eased );
            currentCamera.updateProjectionMatrix();
        }

        orbit.update();
        render();

        if ( t < 1 ) {
            requestAnimationFrame( update );
        } else {
            isTransitioning = false;
        }
    }

    update();
}

// Toggles Gizmos On/Off
function toggleGizmo(  ) {
    // control.enabled = ! control.enabled;
    showGizmo = ! showGizmo;

    control1.showX = control1.showY = control1.showZ = ! control1.showX;
    control2.showX = control2.showY = control2.showZ = ! control2.showX;
}

// Transformation Matrix 
let isPlaying = false;
let progress = 0;
let duration = 3.0; // seconds
let lastTime = 0;

let order = 'TRS';
const transformNames = {
    T: "Translation",
    R: "Rotation",
    S: "Scale"
};

let startMesh, endMesh, animationMesh;

// UI Elements
const playButton = document.getElementById( 'playButton' );
const progressBar = document.getElementById( 'progressBar' );
const phaseMarkersContainer = document.getElementById( 'phaseMarkers' );
const orderContainer = document.getElementById( 'orderContainer' );
const transformUI = document.getElementById( 'transformUI' );
const gizmoButton = document.getElementById( 'gizmoToggle' );
const perspectiveButton = document.getElementById( 'perspectiveChange' );
const indipendentTransformations = document.getElementById( 'indipendentTransforms' );
const frontViewButton = document.getElementById( 'frontView' );
const rightViewButton = document.getElementById( 'rightView' );
const leftViewButton = document.getElementById( 'leftView' );
const topViewButton = document.getElementById( 'topView' );
const resetButtons = document.querySelectorAll( 'button[data-target][data-action]' );
const collapseButton = document.getElementById( 'collapseSideBar' );
const expandButton = document.getElementById( 'expandSideBar' );
const expandBox = document.querySelectorAll( '.expandBox' );
const collapsableClass = document.querySelectorAll( '.panelSection' );
const legendToggle = document.getElementById( 'legendToggle' );
const legendContent = document.getElementById( 'legendContent' );

playButton.addEventListener('click', (e) => {
    e.target.blur();
    playAnim();
});

// Updates Progress Bar, text value, animation time
function playAnim (  ) {
    // If Animation is Concluded, Restart
    if ( ! isPlaying && progress == 1 ) progress = 0;

    isPlaying = ! isPlaying;
    playButton.textContent = isPlaying ? 'Stop' : 'Play';
    lastTime = performance.now();
}

progressBar.addEventListener('input', (e) => {
    progress = parseFloat( e.target.value );
    matrixTransformation( startMesh, endMesh, animationMesh, progress, order );
});

perspectiveButton.addEventListener('click', (e) => {
    e.target.blur();
    perspectiveButton.textContent = currentCamera.isPerspectiveCamera ? '3D' : '2D';
    changeCamera();
});

gizmoButton.addEventListener('click', (e) => {
    e.target.blur();
    toggleGizmo();
});

indipendentTransformations.addEventListener('click', (e) => {
    e.target.blur();
    updatePhaseMarkers();
});

phaseMarkersContainer.addEventListener('click', (e) => {
    if ( ! isAnimationMode || ! indipendentTransformations.checked ) return;

    const rect = phaseMarkersContainer.getBoundingClientRect();
    const clickX = ( e.clientX - rect.left ) / rect.width;
    const phases = [1/3, 2/3];
    const tolerance = 0.05;

    for ( const p of phases ) {
        if ( Math.abs( clickX - p ) < tolerance ) {
            progress = p;
            progressBar.value = progress;
            matrixTransformation( startMesh, endMesh, animationMesh, progress, order );
            break;
        }
    }
});

// Sets Camera in Front View
frontViewButton.addEventListener('click', (e) => {
    e.target.blur();
    smoothCameraTransition( new THREE.Vector3( 0, 0, 2 ) );
});
// Sets Camera in Left View
leftViewButton.addEventListener('click', (e) => {
    e.target.blur();
    smoothCameraTransition( new THREE.Vector3( -3, 0, 0 ) );
});
// Sets Camera in Right View
rightViewButton.addEventListener('click', (e) => {
    e.target.blur();
    smoothCameraTransition( new THREE.Vector3( 3, 0, 0 ) );
});
// Sets Camera in Top View
topViewButton.addEventListener('click', (e) => {
    e.target.blur();
    smoothCameraTransition( new THREE.Vector3( 0, 2, 0 ) );
});

// Attach an event listener to each reset button individually
resetButtons.forEach( ( btn ) => {

      btn.addEventListener( 'click', ( e ) => {

            // Prevent focus outline issues
            e.target.blur();

            // Do not allow resets during animation mode
            if ( isAnimationMode ) return;

            const action = btn.dataset.action;
            const target = btn.dataset.target;

            let mesh = null;

            if ( target === 'mesh1' ) mesh = myMesh1;
            if ( target === 'mesh2' ) mesh = myMesh2;

            if ( ! mesh || ! mesh.userData.original ) return;

            // Execute the correct reset function
            if ( action === 'resetPosition' ) {
                  // Restore original position
                  mesh.position.copy( mesh.userData.original.position );
            }

            if ( action === 'resetRotation' ) {
                  // Restore original rotation
                  mesh.rotation.copy( mesh.userData.original.rotation );
            }

            if ( action === 'resetScale' ) {
                  // Restore original scale
                  mesh.scale.copy( mesh.userData.original.scale );
            }

            // Update TransformControls after resetting
            control1.updateMatrixWorld();
            control2.updateMatrixWorld();

            render();
      });

});

// Collapses SideBar
collapseButton.addEventListener( 'click', (e) => {
    e.target.blur();

    document.getElementById( 'sidePanel' ).classList.add( 'collapsed' );
    collapsableClass.forEach( ( panel ) => {
        panel.classList.add( 'collapsed' );
    });

    setTimeout( function() { expandBox[0].style.display = 'block'; }, 200 );
});
// Expands Collapsed Sidebar
expandButton.addEventListener( 'click', (e) => {
    e.target.blur();

    document.getElementById( 'sidePanel' ).classList.remove( 'collapsed' );
    collapsableClass.forEach( ( panel ) => {
        panel.classList.remove( 'collapsed' );
    });
    expandBox[0].style.display = 'none';
});

// Toggles Legend
legendToggle.addEventListener( 'click', (e) => {
    e.target.blur();
    legendContent.style.display = legendContent.style.display == 'block' ? 'none' : 'block';
});

let phaseLines = [];

function updatePhaseMarkers() {
    // Cancella vecchie linee
    phaseMarkersContainer.innerHTML = '';
    phaseLines = [];

    // Mostra linee solo se in animation mode + trasformazioni indipendenti
    if (!isAnimationMode || !indipendentTransformations.checked) return;

    const phases = [1/3, 2/3];
    phases.forEach( (phase, i) => {
        const line = document.createElement( 'div' );
        line.classList.add( 'phase-line' );
        line.style.left = `${phase * 100}%`;
        line.dataset.value = phase;

        // Area di tolleranza per il click (±0.03)
        line.addEventListener('click', (e) => {
            progress = parseFloat( line.dataset.value );
            progressBar.value = progress;
            matrixTransformation( startMesh, endMesh, animationMesh, progress, order );
        });

        phaseMarkersContainer.appendChild( line );
        phaseLines.push( line );
    });
}

function updateTransformation() {
    if ( isPlaying ) {
        const now = performance.now();
        const delta = ( now - lastTime ) / 1000;
        lastTime = now;

        progress += delta / duration;
        if ( progress > 1 ) {
            progress = 1;
            isPlaying = false;
            playButton.textContent = 'Play';
        }

        progressBar.value = progress;
        matrixTransformation( startMesh, endMesh, animationMesh, progress, order );
    }

    requestAnimationFrame( updateTransformation );
}

function matrixTransformation( meshA, meshB, animationMesh, t, order = 'TRS' ) {
    const isIndependent = indipendentTransformations.checked;

    const quatA = meshA.quaternion;
    const quatB = meshB.quaternion;

    let finalMatrix = new THREE.Matrix4();

    if ( ! isIndependent ) {
        // Normal Case, All Transformations Toghether 
        const position = new THREE.Vector3().lerpVectors( meshA.position, meshB.position, t );
        const rotation = new THREE.Quaternion().slerpQuaternions( quatA, quatB, t );
        const scale = new THREE.Vector3().lerpVectors( meshA.scale, meshB.scale, t );

        const translationMatrix = new THREE.Matrix4().makeTranslation( position.x, position.y, position.z );
        const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion( rotation );
        const scaleMatrix = new THREE.Matrix4().makeScale( scale.x, scale.y, scale.z );

        for ( let c of order ) {
            if ( c === 'T') finalMatrix.multiply( translationMatrix );
            if ( c === 'R') finalMatrix.multiply( rotationMatrix );
            if ( c === 'S') finalMatrix.multiply( scaleMatrix );
        }
    } else {
        // Indipendent Transformations: One Transformation at a time
        const step = 1 / 3;
        const phase = Math.min(Math.floor(t / step), 2);
        const localT = (t - phase * step) / step;

        let currentPos = meshA.position.clone();
        let currentRot = meshA.quaternion.clone();
        let currentScale = meshA.scale.clone();

        for ( let i = 0; i <= phase; i++ ) {
            let interpT = ( i === phase ) ? localT : 1;

            switch ( order[i] ) {
                case 'T':
                currentPos.lerpVectors( meshA.position, meshB.position, interpT );
                break;

                case 'R':
                currentRot.slerpQuaternions( meshA.quaternion, meshB.quaternion, interpT );
                break;

                case 'S':
                currentScale.lerpVectors( meshA.scale, meshB.scale, interpT );
                break;

            }
        }

        const translationMatrix = new THREE.Matrix4().makeTranslation(currentPos.x, currentPos.y, currentPos.z);
        const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(currentRot);
        const scaleMatrix = new THREE.Matrix4().makeScale(currentScale.x, currentScale.y, currentScale.z);

        for ( let c of order ) {
            if ( c === 'T' ) finalMatrix.multiply( translationMatrix );
            if ( c === 'R' ) finalMatrix.multiply( rotationMatrix );
            if ( c === 'S' ) finalMatrix.multiply( scaleMatrix );
        }
    }

    // Applies Final Matrix
    animationMesh.matrix.copy( finalMatrix );
    animationMesh.matrix.decompose( animationMesh.position, animationMesh.quaternion, animationMesh.scale );
}

let isAnimationMode = false;

function transformState( ) {
    // Disable gizmos if visible
    if ( showGizmo ) toggleGizmo();

    if ( changeModeButton.value === "Animation Mode" ) {
        // Enter animation mode
        isAnimationMode = true; // <— animation mode ON
        changeModeButton.value = "Move Mode";
        transformUI.style.display = "block";

        if ( ! animationMesh ) createAnimationMesh();
        animationMesh.visible = true;
        updatePhaseMarkers();

        setMeshTransparency( myMesh1, true );
        setMeshTransparency( myMesh2, true );

        control1.enabled = false;
        control2.enabled = false;

        outlinePersp.selectedObjects = [];
        outlineOrtho.selectedObjects = [];
        outlinePersp.enabled = false;
        outlineOrtho.enabled = false;

    } else {
        // Exit animation mode
        isAnimationMode = false; // <— animation mode OFF
        changeModeButton.value = "Animation Mode";
        transformUI.style.display = "none";

        phaseMarkersContainer.innerHTML = '';

        setMeshTransparency( myMesh1, false );
        setMeshTransparency( myMesh2, false );

        if ( animationMesh ) animationMesh.visible = false;

        isPlaying = false;
        progress = 0;
        playButton.textContent = "Play";
        progressBar.value = 0;

        if ( startMesh && endMesh && animationMesh ) {
            matrixTransformation( startMesh, endMesh, animationMesh, 0, order );
        }

        control1.enabled = true;
        control2.enabled = true;

        outlinePersp.enabled = true;
        outlineOrtho.enabled = true;
    }
}

function setMeshTransparency( meshGroup, transparent ) {
    meshGroup.traverse( ( child ) => {
        if ( ! child.isMesh ) return;

        // Normalizes Always in Array
        const materials = Array.isArray( child.material ) ? child.material : [child.material];

        if ( transparent ) {
            // Saves Original Materials if not yet saved
            if ( ! child.userData.originalMaterial ) {
                child.userData.originalMaterial = materials.map( ( m ) => m);
            }

            const newMaterials = materials.map( ( mat ) => {
                if ( ! mat ) return mat; // Skips Undefined Materials

                // If Material has clone() method, use that
                if ( typeof mat.clone !== 'function' ) {
                    const fallback = mat;
                    fallback.transparent = true;
                    fallback.opacity = 0.25;
                    fallback.depthWrite = false;
                    return fallback;
                }

                // otherwise create safe clone() method
                const cloned = mat.clone();
                cloned.transparent = true;
                cloned.opacity = 0.25;
                cloned.depthWrite = false;

                if ( cloned.color && cloned.color.isColor ) {
                    cloned.color.offsetHSL( 0, -0.2, 0.1 );
                }

                return cloned;
            } );

            child.material = Array.isArray( child.material ) ? newMaterials : newMaterials[0];
        } else {
            // Resets Original Materials if present
            if ( child.userData.originalMaterial ) {
                const original = child.userData.originalMaterial;
                child.material = Array.isArray( child.material ) ? original : original[0];
                delete child.userData.originalMaterial;
            }
        }
    });
}

// Sets up Dragging to Select Order of Transformations
let draggedItem = null;

// Activates Drag & Drop
orderContainer.querySelectorAll( '.order-item' ).forEach( item => {
  item.addEventListener('dragstart', () => {
    draggedItem = item;
    item.classList.add('dragging');
  });
  
  item.addEventListener('dragend', () => {
    draggedItem.classList.remove('dragging');
    draggedItem = null;

    updateOrder();
  });
});

orderContainer.addEventListener( 'dragover', (e) => {
  e.preventDefault();
  const afterElement = getDragAfterElement(orderContainer, e.clientY);
  if (afterElement == null) {
    orderContainer.appendChild(draggedItem);
  } else {
    orderContainer.insertBefore(draggedItem, afterElement);
  }
});

function getDragAfterElement( container, y ) {
  const draggableElements = [...container.querySelectorAll('.order-item:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Updates the global variable "order" used in the animation
function updateOrder() {
  const items = Array.from(orderContainer.querySelectorAll('.order-item'));
  order = items.map(i => i.dataset.key).join(''); // use data-key
  console.log('Nuovo ordine:', order);

  // Updates mesh animation
  matrixTransformation(startMesh, endMesh, animationMesh, progress, order);
}

// Mode tab switching
// Select all tab buttons
const tabs = document.querySelectorAll( '.tab' );
// Select all tab content boxes
const tabContents = document.querySelectorAll( '.tabContent' );
tabs.forEach( tab => {
      tab.addEventListener( 'click', () => {

            /* Remove active class from all tabs */
            tabs.forEach( t => t.classList.remove( 'active' ) );

            /* Set this tab active */
            tab.classList.add( 'active' );

            const target = tab.dataset.tab;

            /* Show only matching content */
            tabContents.forEach( box => {
                  if ( box.dataset.tab === target ) {
                        box.classList.remove( 'hidden' );
                  } else {
                        box.classList.add( 'hidden' );
                  }
            } );

      } );
});

// Resets only the position of the mesh
function resetMeshPosition ( mesh ) {
      // Restore original stored position
      mesh.position.copy( mesh.userData.original.position );
}
// Resets only the rotation of the mesh
function resetMeshRotation ( mesh ) {
      // Restore original stored rotation
      mesh.rotation.copy( mesh.userData.original.rotation );
}
// Resets only the scale of the mesh
function resetMeshScale ( mesh ) {
      // Restore original stored scale
      mesh.scale.copy( mesh.userData.original.scale );
}

// ########################################### Keybinds ########################################### //

window.addEventListener( 'keydown', function(event) {
    switch ( event.key ) {
        // Snap Transforms
        case 'Shift':
            control1.setTranslationSnap( 0.5 );
            control1.setRotationSnap( THREE.MathUtils.degToRad(15) );
            control1.setScaleSnap( 0.0005 );
            control2.setTranslationSnap( 0.5 );
            control2.setRotationSnap( THREE.MathUtils.degToRad(15) );
            control2.setScaleSnap( 0.0005 );
            break;
        // Translate
        case 'w':
            control1.setMode( 'translate' );
            control2.setMode( 'translate' );
            break;

        // Rotate
        case 'r':
            control1.setMode( 'rotate' );
            control2.setMode( 'rotate' );
            break;

        // Scale
        case 's':
            control1.setMode( 'scale' );
            control2.setMode( 'scale' );
            break;

        // Change Camera ~ Perspective / Orthogonal
        case 'c': 
            changeCamera();
            break;

        // Front View
        case '1':
            smoothCameraTransition( new THREE.Vector3( 0, 0, 2 ) );
            break;

        // Right View
        case '2':
            smoothCameraTransition( new THREE.Vector3( -3, 0, 0) );
            break;

        // Top View
        case '3':
            smoothCameraTransition( new THREE.Vector3( 3, 0, 0 ) );
            break;

        case '4' :
            smoothCameraTransition( new THREE.Vector3( 0, 2, 0 ) );
            break;

        // Disable / Enable Transformations
        case ' ':
            changeModeButton.value == "Animation Mode" ? toggleGizmo() : playAnim();
            break;

        // Cancel Current Transformation
        case 'Escape':
            control1.reset();
            control2.reset();
            break;
    }
} );

window.addEventListener( 'keyup', function(event){
    switch( event.key ){
        case 'Shift':
            control1.setTranslationSnap( null );
            control1.setRotationSnap( null );
            control1.setScaleSnap( null );
            control2.setTranslationSnap( null );
            control2.setRotationSnap( null );
            control2.setScaleSnap( null );
            break;
    }
} );

// Drag Movement
let isDragging = false;
let currentButton = null;
let activeControl = null;

renderer.domElement.addEventListener( 'mousedown', (event) => {
    // Block all interactions in animation mode
    if ( isAnimationMode ) return;

    // If in Gizmo Mode, exit
    if ( showGizmo ) return;
    if ( !hovering ) return;

    // Saves pressed mouse button
    currentButton = event.button; // 0 = left, 1 = middle, 2 = right
    
    // Determines which TransformControls to use ( which mesh is being hovered )
    activeControl = (hovering === 1) ? control1 : control2;
    
    // Determines transformation mode depending on mouse button pressed
    switch ( currentButton ) {
        case 0: // Left mouse button → translate
            activeControl.setMode( 'translate' );
            activeControl.axis = 'XYZ';
            break;

        case 1: // Middle mouse button → scale
            activeControl.setMode( 'scale' );
            activeControl.axis = 'XYZ';
            event.preventDefault(); // prevents mouse scroll
            break;

        case 2: // Right mouse button → rotate
            activeControl.setMode( 'rotate' );
            activeControl.axis = 'XYZE';
            event.preventDefault(); // prevents contextual menu
            break;
    }

    // Enables TransformControls then calls pointerDown
    activeControl.enabled = true;
    orbit.enabled = false;
    
    activeControl.pointerDown( activeControl._getPointer( event ) );
    
    isDragging = true;
});

renderer.domElement.addEventListener( 'mousemove', (event) => {
    if ( isDragging && activeControl ) {
        activeControl.pointerMove( activeControl._getPointer( event ) );
    }
});

renderer.domElement.addEventListener( 'mouseup', (event) => {
    if ( isDragging && activeControl ) {
        activeControl.pointerUp( activeControl._getPointer( event ) );
        isDragging = false;
        currentButton = null;
        activeControl = null;

        // Enable Camera
        orbit.enabled = true;
    }
});

window.addEventListener( 'resize', onWindowResize, false );
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    // Aggiorna camera prospettica
    cameraPersp.aspect = aspect;
    cameraPersp.updateProjectionMatrix();

    // Aggiorna camera ortografica
    cameraOrtho.left = -frustumSize * aspect;
    cameraOrtho.right = frustumSize * aspect;
    cameraOrtho.top = frustumSize;
    cameraOrtho.bottom = -frustumSize;
    cameraOrtho.updateProjectionMatrix();

    // Aggiorna renderer
    renderer.setSize( width, height );
    renderer.setPixelRatio( window.devicePixelRatio );

    // Aggiorna entrambi i composer
    composerPersp.setSize( width, height );
    composerOrtho.setSize( width, height );

    // Aggiorna entrambi gli OutlinePass
    outlinePersp.setSize( width, height );
    outlineOrtho.setSize( width, height );

    // Aggiorna FXAA (per evitare pixelation)
    fxaaShader.uniforms["resolution"].value.set( 1 / width, 1 / height );

    render();
}

// ############################################ Other ############################################ //

function render() {
    interactionManager.update();

    // renderer.render( scene, currentCamera );
    // composer.render( scene, currentCamera );

    currentComposer.render( scene, currentCamera );
}

function animate(){
    requestAnimationFrame( animate );

    orbit.update();

    render();
}

// Start Functions
createInitialMeshes();
startMesh = scene.children[10];
endMesh = scene.children[11];
console.log(scene);

render();
animate();
updateTransformation();