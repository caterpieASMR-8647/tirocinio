import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { EffectComposer, OrbitControls, RenderPass, SceneUtils, ShaderPass, ThreeMFLoader } from 'three/examples/jsm/Addons.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { InteractionManager } from '../node_modules/THREE.Interactive-1.8.0/build/three.interactive'
import { OutlinePass } from 'three/examples/jsm/Addons.js';
import { FXAAShader } from 'three/examples/jsm/Addons.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { computeMorphedAttributes } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { element, getParallaxCorrectNormal } from 'three/tsl';
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js';
import { Group, Vector4 } from 'three/webgpu';

// ########################################### Classes ########################################### //

// Enables the use of Right and Middle Mouse click for Transformations
// class MultiButtonTransformControls extends TransformControls {
//     pointerDown(pointer) {
//         // If the original implementation already uses this._dragging check, keep it:
//         if ( this._dragging ) return;

//         // Create a pointer object that is identical but with button = 0
//         const fakePointer = Object.assign( {}, pointer, { button: 0 } );

//         // Call the original pointerDown with the fake pointer so all internal logic runs
//         super.pointerDown( fakePointer );
//     }
// }

// ########################################## Elements ########################################### //

let changeModeButton = document.getElementById("transformState");
changeModeButton.addEventListener( 'click', transformState );

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
let aspect = 4 / 3;
const frustumSize = 5;

const cameraPersp = new THREE.PerspectiveCamera(
    75,
    aspect,
    0.1,
    1000
);

const cameraOrtho = new THREE.OrthographicCamera(
    -frustumSize * aspect,
    frustumSize * aspect,
    frustumSize,
    - frustumSize,
    0.1,
    100
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
control1.addEventListener( 'change', render );
control1.addEventListener( 'dragging-changed', function (event) {
    orbit.enabled = ! event.value;
} );

let control2 = new TransformControls( currentCamera, renderer.domElement );
control2.addEventListener( 'change', render );
control2.addEventListener( 'dragging-changed', function (event) {
    orbit.enabled = ! event.value;
} );

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
                let selectedObjects = [];
                selectedObjects[0] = event.target;
                outlinePersp.selectedObjects = selectedObjects;
                outlineOrtho.selectedObjects = selectedObjects;
                document.body.style.cursor = 'pointer';
                hovering = 1;
            });
            myMesh1.addEventListener('mouseout', (event) => {
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
                let selectedObjects = [];
                selectedObjects[0] = event.target;
                outlinePersp.selectedObjects = selectedObjects;
                outlineOrtho.selectedObjects = selectedObjects;
                document.body.style.cursor = 'pointer';
                hovering = 2;
            });
            myMesh2.addEventListener('mouseout', (event) => {
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

function createAnimationMesh(  ) {
    // if ( scene.children.length == 13 ) { return; }

    startMesh = myMesh1;
    endMesh = myMesh2;

    let animationMesh = startMesh.clone();
    animationMesh.visible = ! animationMesh.visible;
    scene.add( animationMesh );

    // animationMesh = scene.children[12];
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
const orderContainer = document.getElementById('orderContainer');
const transformUI = document.getElementById( 'transformUI' );

playButton.addEventListener('click', () => {
    isPlaying = !isPlaying;
    playButton.textContent = isPlaying ? 'Stop' : 'Play';
    lastTime = performance.now();
});

progressBar.addEventListener('input', (e) => {
    progress = parseFloat( e.target.value );
    matrixTransformation( startMesh, endMesh, animationMesh, progress, order );
});

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
    // Interpolates Position
    const position = new THREE.Vector3().lerpVectors( meshA.position, meshB.position, t );

    // Interpolates Rotation (quaternion)
    const quatA = meshA.quaternion;
    const quatB = meshB.quaternion;
    const rotation = new THREE.Quaternion().slerpQuaternions( quatA, quatB, t );

    // Interpolates Scale
    const scale = new THREE.Vector3().lerpVectors( meshA.scale, meshB.scale, t );

    // Creates Single Transformation Matrixes
    const translationMatrix = new THREE.Matrix4().makeTranslation( position.x, position.y, position.z );
    const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion( rotation );
    const scaleMatrix = new THREE.Matrix4().makeScale( scale.x, scale.y, scale.z );

    // Constructs Composite Matrix in Desired Order
    let finalMatrix = new THREE.Matrix4();
    for ( let c of order ) {
        if ( c === 'T' ) finalMatrix.multiply( translationMatrix );
        if ( c === 'R' ) finalMatrix.multiply( rotationMatrix );
        if ( c === 'S' ) finalMatrix.multiply( scaleMatrix );
    }

    // Applies Matrix
    animationMesh.matrix.copy( finalMatrix );
    animationMesh.matrix.decompose( animationMesh.position, animationMesh.quaternion, animationMesh.scale );
}

export function transformState(  ) {
    scene.children.forEach( element => {
        if ( element.type == "Group" || element.type == "Object3D" ) {
            element.visible = ! element.visible;
        }
    } );

    if ( changeModeButton.value == "Animation Mode" ) { // Goes into Animation Mode
        changeModeButton.value = "Move Mode";
        transformUI.style.display = "block";
    }
    else { // Goes into Move Mode
        changeModeButton.value = "Animation Mode";
        transformUI.style.display = "none";

        // Resets Animation
        isPlaying = false;
        progress = 0;
        playButton.textContent = "Play";
        progressBar.value = 0;
        // Actual Animation Reset
        if (startMesh && endMesh && animationMesh) {
            matrixTransformation(startMesh, endMesh, animationMesh, 0, order);
        }
    }

    control1.enabled = ! control1.enabled;
    control2.enabled = ! control2.enabled;

    animationMesh = scene.children[12];

    console.log( scene );
};

// Sets up Dragging to Select Order of Transformations
let draggedItem = null;

// Activates Drag & Drop
orderContainer.querySelectorAll('.order-item').forEach(item => {
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

orderContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  const afterElement = getDragAfterElement(orderContainer, e.clientY);
  if (afterElement == null) {
    orderContainer.appendChild(draggedItem);
  } else {
    orderContainer.insertBefore(draggedItem, afterElement);
  }
});

function getDragAfterElement(container, y) {
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
  order = items.map(i => i.dataset.key).join(''); // usa data-key
  console.log('Nuovo ordine:', order);

  // Aggiorna subito la mesh animata
  matrixTransformation(startMesh, endMesh, animationMesh, progress, order);
}

// ########################################### Keybinds ########################################### //

let showGizmo = true;

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
            if ( isTransitioning ) break; // Prevents Multiple Transitions

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
            
            break;

        // Only Show X Gizmo
        case 'x':
            control1.showX = ! control1.showX;
            control2.showX = ! control2.showX;
            break;

        // Only Show Y Gizmo
        case 'y':
            control1.showY = ! control1.showY;
            control2.showY = ! control2.showY;
            break;

        // Only Show Z Gizmo
        case 'z':
            control1.showZ = ! control1.showZ;
            control2.showZ = ! control2.showZ;
            break;

        // Disable / Enable Transformations
        case ' ':
            // control.enabled = ! control.enabled;
            showGizmo = ! showGizmo;

            control1.showX = ! control1.showX;
            control1.showY = ! control1.showY;
            control1.showZ = ! control1.showZ;
            control2.showX = ! control2.showX;
            control2.showY = ! control2.showY;
            control2.showZ = ! control2.showZ;

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

renderer.domElement.addEventListener( 'mousedown', (event) => {

    switch ( control1.getMode() ) {
        case 'translate': // left → translate
            // control.setMode('translate');
            control1.axis = 'XYZ';  // on screen plane translation
            control2.axis = 'XYZ';
            break;

        case 'rotate': // right → rotate
            // control.setMode('rotate');
            control1.axis = 'XYZE';  // free rotation
            control2.axis = 'XYZE';
            break;

        case 'scale': // middle (mouse wheel) → scale
            // control.setMode('scale');
            control1.axis = 'XYZ';  // uniform scale
            control2.axis = 'XYZ';
            break;
    }

    // if ( ! meshes || showGizmo ) return;
    if ( showGizmo ) return;
    switch ( hovering ) {
        case 0:
            break;
        
        case 1:
            control1.pointerDown( control1._getPointer( event ) );
            // Disable Camera
            orbit.enabled = false;
            break;

        case 2:
            control2.pointerDown( control2._getPointer( event ) );
            // Disable Camera
            orbit.enabled = false;
            break;
    }

    isDragging = true;
});

renderer.domElement.addEventListener( 'mousemove', (event) => {

    if ( isDragging ) {
        switch ( hovering ) {
            case 0:
                break;
            
            case 1:
                control1.pointerMove( control1._getPointer( event ) );
                break;

            case 2:
                control2.pointerMove( control2._getPointer( event ) );
                break;
        }
    }

});

renderer.domElement.addEventListener( 'mouseup', (event) => {
    if ( isDragging ) {
        control1.pointerUp( control1._getPointer( event ) );
        control2.pointerUp( control2._getPointer( event ) );
        isDragging = false;
        currentButton = null;

        // Enable Camera
        orbit.enabled = true;
    }
});

// ####################################### EventListeners ######################################## //

// window.addEventListener('resize', onWindowResize, false);
// function onWindowResize() {
//     aspect = window.innerWidth / window.innerHeight;

//     cameraPersp.aspect = aspect;
//     cameraPersp.updateProjectionMatrix();

//     cameraOrtho.left = cameraOrtho.bottom * aspect;
//     cameraOrtho.right = cameraOrtho.top * aspect;
//     cameraOrtho.updateProjectionMatrix();

//     renderer.setSize(window.innerWidth, window.innerHeight);

//     render();
// }

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