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
import { Vector4 } from 'three/webgpu';

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


let hovering = false;

function createMesh(  ) {

    let myMesh1 = new THREE.Group();
    let myMesh2 = new THREE.Group();

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

            mesh.scale.set( .001, .001, .001);
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

            console.log( mesh );
            console.log( myMesh1 );

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

            mesh.scale.set(.001, .001, .001 );
            const box = new THREE.Box3().setFromObject( mesh );
            const center = new THREE.Vector3();
            box.getCenter( center );
            
            // Translates Mesh so that its Mass Center is in the Center of the Group
            mesh.position.sub( center );

            mesh.scale.set(.001, .001, .001);
            myMesh2.add( mesh );
            
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
    scene.add( control2.getHelper() );

}

// Merges Group of Meshes into Single Mesh
function groupToMesh ( group ) {

    if ( ! group.isGroup ) return;

    let geoms = [];
    let meshes = [];
    group.children.forEach( e => {
        if ( e.geometry.attributes.uv1 ) { delete e.geometry.attributes.uv1; }
        e.isMesh && meshes.push( e ) && ( geoms.push( ( e.geometry.index ) ? e.geometry.toNonIndexed() : e.geometry.clone() ) ) 
    } );
    geoms.forEach( ( g, i ) => g.applyMatrix4( meshes[i].matrixWorld ) );
    let gg = BufferGeometryUtils.mergeGeometries( geoms );
    gg.applyMatrix4( group.matrix.clone().invert() );
    gg.userData.materials = meshes.map( m => m.material );
    // return new THREE.Mesh( gg , new THREE.MeshStandardMaterial( gg.userData.materials ) );
    gg.computeBoundingSphere();
    let boundingSphere = gg.boundingSphere;
    console.log( boundingSphere );
    let ret = [];
    ret.push( boundingSphere.center );
    ret.push( boundingSphere.radius );
    
    return ret;

}

// Transizione Smooth Camera con Effetto Hitchcock
let isTransitioning = false;
let transitionProgress = 0;
const transitionDuration = 0.3; // seconds

// Funzione per interpolare tra due valori
function lerp( start, end, t ) {
    return start + ( end - start ) * t;
}

// Funzione di easing per una transizione più fluida
function easeInOutCubic( t ) {
    return t < 0.5 
        ? 4 * t * t * t 
        : 1 - Math.pow( -2 * t + 2, 3 ) / 2;
}

// Funzione per animare la transizione della camera con effetto Hitchcock
function animateCameraTransition(fromCamera, toCamera, duration, onComplete) {
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
    let visibleHeight; // 🔥 DICHIARATA QUI (visibile in tutto il blocco)
    
    if (toCamera.isOrthographicCamera) {
        // Da prospettiva → ortografica
        startFov = fromCamera.fov;
        targetFov = 2; // FOV piccolo = zoom in
        
        const startVFov = THREE.MathUtils.degToRad(startFov);
        visibleHeight = 2 * Math.tan(startVFov / 2) * distance; // 🔥 ORA È NELLO SCOPE ESTERNO
        
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
        // Da ortografica → prospettiva
        visibleHeight = (frustumSize * 2) / fromCamera.zoom; // 🔥 ORA È NELLO SCOPE ESTERNO
        
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
    
    // 🔧 updateTransition usa ora visibleHeight correttamente
    function updateTransition() {
        const currentTime = performance.now();
        const elapsed = (currentTime - startTime) / 1000;
        transitionProgress = Math.min(elapsed / duration, 1);

        const easedProgress = easeInOutCubic(transitionProgress);
        const currentFov = lerp(startFov, targetFov, easedProgress);

        let currentDistance;

        if (toCamera.isPerspectiveCamera) {
            // Da ortografica → prospettica
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
            // Da prospettica → ortografica
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
            if ( isTransitioning ) break; // Previeni transizioni multiple

            const oldCamera = currentCamera;
            
            // Determina quale sarà la nuova camera (ma NON cambiarla ancora!)
            const newCamera = currentCamera.isPerspectiveCamera ? cameraOrtho : cameraPersp;
            const newComposer = currentCamera.isPerspectiveCamera ? composerOrtho : composerPersp;
            
            if ( currentCamera.isOrthographicCamera ) {
                currentCamera = newCamera;
                currentComposer = newComposer;
            }

            // Avvia l'animazione con callback
            animateCameraTransition( oldCamera, newCamera, transitionDuration, () => {
                // Callback alla fine dell'animazione
                if ( currentCamera.isPerspectiveCamera ) {
                    currentCamera = newCamera;
                    currentComposer = newComposer;
                }
                
                // Aggiorna i controlli DOPO l'animazione
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
createMesh();

render();
animate();