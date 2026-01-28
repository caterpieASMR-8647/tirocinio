// IMPORTANT: "three": "././three/three/build/three.module.js"
// IMPORTANT: "@addons/": "./three/three/examples/jsm/"
// IMPORTANT: "@interactive/": "./three/THREE.Interactive-1.8.0/"

import * as THREE from 'three';

import { OrbitControls } from '@addons/controls/OrbitControls.js';
import { TransformControls } from '@addons/controls/TransformControls.js';
import { FBXLoader } from '@addons/loaders/FBXLoader.js';
import { EffectComposer } from '@addons/postprocessing/EffectComposer.js';
import { RenderPass } from '@addons/postprocessing/RenderPass.js';
import { OutlinePass } from '@addons/postprocessing/OutlinePass.js';
import { GammaCorrectionShader } from '@addons/shaders/GammaCorrectionShader.js';
import { ShaderPass } from '@addons/postprocessing/ShaderPass.js';
import { FXAAShader } from '@addons/shaders/FXAAShader.js';
import { InteractionManager } from '@interactive/build/three.interactive.js'

// ########################################## Elements ########################################### //

// let changeModeButton = document.getElementById("transformState");
// changeModeButton.addEventListener( 'click', (e) => {
//     e.target.blur();
//     transformState();
// } );

// ########################################### Renderer ########################################## //

const canvasContainer = document.getElementById( "canvasContainer" );
const canvas = document.getElementById( "render3d" ); 
canvas.addEventListener( "contextmenu", ( e ) => {
    e.preventDefault();
} );
const renderer = new THREE.WebGLRenderer( { canvas: canvas , antialias : true , logarithmicDepthBuffer: true } );
document.getElementById( "canvasContainer" ).appendChild( renderer.domElement );
// renderer.physicallyCorrectLights = true;

// ############################################ Scene ############################################ //

// Grids
const scene = new THREE.Scene();
// scene.add( new THREE.AxesHelper(5) );
var bottomGrid = new THREE.GridHelper( 10, 20, 0x444444, 0x444444 );
bottomGrid.position.y += -5;
var topGrid = new THREE.GridHelper( 10, 20, 0x444444, 0x444444 );
topGrid.position.y += 5;
var frontGrid = new THREE.GridHelper( 10, 20, 0x444444, 0x444444 );
frontGrid.rotation.x = Math.PI * 0.5;
frontGrid.position.z += -5;
var leftGrid = new THREE.GridHelper( 10, 20, 0x444444, 0x444444 );
leftGrid.rotation.x = Math.PI * 0.5;
leftGrid.rotation.z = Math.PI * 0.5;
leftGrid.position.x += -5;
var rightGrid = new THREE.GridHelper( 10, 20, 0x444444, 0x444444 );
rightGrid.rotation.x = Math.PI * 0.5;
rightGrid.rotation.z = Math.PI * 0.5;
rightGrid.position.x += 5;
scene.add( bottomGrid, topGrid, frontGrid, leftGrid, rightGrid );

// const light = new THREE.PointLight( 0xffffff, 1000000000 );
// light.position.set(0.8, 1.4, 1.0);
// scene.add( light );
// const ambientLight = new THREE.AmbientLight();
// scene.add( ambientLight );

const lightA = new THREE.DirectionalLight( 0xffffff, 1 );
lightA.position.set( 1, 1, 1 );
scene.add( lightA );

const lightB = new THREE.DirectionalLight( 0xddddff, 1 );
lightB.position.set( -1, -1, -1 );
scene.add( lightB );

const ambient = new THREE.AmbientLight( 0x404040, 5 );
scene.add( ambient );

// ########################################### Cameras ########################################### //
let aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
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
orbit.addEventListener( 'start', clearActiveViewButton );
orbit.addEventListener( 'change', render );

let control1 = new TransformControls( currentCamera, renderer.domElement );
control1.showX = control1.showY = control1.showZ = false;
control1.addEventListener( 'change', render );
control1.addEventListener( 'dragging-changed', function (event) {
    orbit.enabled = ! event.value;
} );
control1.addEventListener( 'objectChange', () => {
    if ( control1.mode !== 'scale' ) return;
    clampScale( control1.object );
});

let control2 = new TransformControls( currentCamera, renderer.domElement );
control2.showX = control2.showY = control2.showZ = false;
control2.addEventListener( 'change', render );
control2.addEventListener( 'dragging-changed', function (event) {
    orbit.enabled = ! event.value;
} );
control2.addEventListener( 'objectChange', () => {
    if ( control2.mode !== 'scale' ) return;
    clampScale( control2.object );
});

// Defaults to NO

let showGizmo = false;

console.log(control1);

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

// const textureLoader = new THREE.TextureLoader();
// textureLoader.load("../three.js-master/examples/textures/tri_pattern.jpg", function(texture){
//     if (texture) {
//         outlinePersp.patternTexture = texture;
//         outlineOrtho.patternTexture = texture;
//         texture.wrapS = THREE.RepeatWrapping;
//         texture.wrapT = THREE.RepeatWrapping;
//     }   
// });

const fxaaShader = new ShaderPass( FXAAShader );
fxaaShader.uniforms["resolution"].value.set( 1/1200, 1/800 );
composerPersp.addPass( fxaaShader );
composerOrtho.addPass( fxaaShader );

let currentComposer = composerPersp;

// ############################################ Funcs ############################################ //

let myMesh1 = new THREE.Group(), myMesh2 = new THREE.Group();
let hovering = false;

const modelSelector = document.getElementById( 'modelSelector' );
let meshesPath = './meshes/';
let modelName = 'plane2.fbx'

modelSelector.addEventListener( 'change', (e) => {
    e.preventDefault();
    modelName = e.target.value;

    // Saves everything i need
    const pos1 =  startMesh.position.clone();
    const quat1 =  startMesh.quaternion.clone();
    const scale1 =  startMesh.scale.clone();
    const pos2 =  endMesh.position.clone();
    const quat2 =  endMesh.quaternion.clone();
    const scale2 =  endMesh.scale.clone();

    let isStillshotActive = stillshotMeshes.length > 0;

    [ startMesh, endMesh, animationMesh, ...stillshotMeshes ].forEach( mesh => {
        disposeMesh( mesh );
        // scene.remove( mesh );
        // mesh.dispose();
    });

    createInitialMeshes();

    startMesh.position = pos1.copy();
    startMesh.quaternion = quat1.copy();
    startMesh.sccale = scale1.copy();
    endMesh.position = pos2.copy();
    endMesh.quaternion = quat2.copy();
    endMesh.scale = scale2.copy();

    if ( isStillshotActive ) generateStillshot();

    if ( isPlaying ) applyPlayTransparency();

    // replaceCurrentMeshes();
});
function disposeMesh( root ) {

    if ( !root ) return;

    
    // Traverse hierarchy
    root.traverse( ( obj ) => {
        
        if ( obj.isMesh ) {
            
            // Geometry
            if ( obj.geometry ) {
                obj.geometry.dispose();
            }
            
            // Materials
            if ( obj.material ) {
                const materials = Array.isArray( obj.material )
                ? obj.material
                : [ obj.material ];
                
                materials.forEach( material => {
                    
                    if ( !material ) return;
                    
                    // Dispose textures
                    for ( const key in material ) {
                        const value = material[ key ];
                        if ( value && value.isTexture ) {
                            value.dispose();
                        }
                    }
                    
                    material.dispose();
                });
            }
        }
    });

    // Remove from parent (NOT only scene)
    if ( root.parent ) {
        root.parent.remove( root );
    }

}

function createNewMeshes() {
    //Loader for FBX Meshes + adds Events for mouse hover
    const loader = new FBXLoader();
    const modelPath = `${meshesPath}${modelName}`;

    loader.load( modelPath,
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

            myMesh2 = myMesh1.clone();

            myMesh2.position.set( 1 , 0, 0 );

            if ( myMesh1 && myMesh2 ) createNewAnimationMesh(  );

            function createNewAnimationMesh() {
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
                            // child.material.depthWrite = true;
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

                setMeshTransparency( animationMesh, true );
                scene.add( animationMesh );

                updateTransformation();

                if ( myMesh1 && myMesh2 && animationMesh ) {
                    cloneMaterials( startMesh );
                    cloneMaterials( endMesh );
                    cloneMaterials( animationMesh );
                }

                console.log( "Animation mesh created:", animationMesh );
            }

            render();
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
        },
        (error) => {
            console.log(error);
        }
    )
}

// Upadtes the Mesh
// ( since scene.matrix = scene.matrixWorld = Identity, mesh.matrixWorld = mesh.matrix )
function commitMatrix( mesh ) {
    mesh.matrixWorld.copy( mesh.matrix );
}

// ======================== Functions to Set or Apply Translation/Rotation/Scale ======================== //
function setPosition( mesh, x, y, z ) {
    const m = mesh.matrix;

    m.elements[12] = x;
    m.elements[13] = y;
    m.elements[14] = z;

    commitMatrix( mesh );
}
function setScale( mesh, s ) {
    const m = mesh.matrix;
    const e = m.elements;

    // extracs axes
    const xAxis = new THREE.Vector3( e[0], e[1], e[2] ).normalize();
    const yAxis = new THREE.Vector3( e[4], e[5], e[6] ).normalize();
    const zAxis = new THREE.Vector3( e[8], e[9], e[10] ).normalize();

    xAxis.multiplyScalar( s );
    yAxis.multiplyScalar( s );
    zAxis.multiplyScalar( s );

    e[0] = xAxis.x; e[1] = xAxis.y; e[2] = xAxis.z;
    e[4] = yAxis.x; e[5] = yAxis.y; e[6] = yAxis.z;
    e[8] = zAxis.x; e[9] = zAxis.y; e[10] = zAxis.z;

    commitMatrix( mesh );
}
function setRotationEuler( mesh, euler ) {
    const m = mesh.matrix;

    // saves translation
    const tx = m.elements[12];
    const ty = m.elements[13];
    const tz = m.elements[14];

    const r = new THREE.Matrix4();
    r.makeRotationFromEuler( euler );

    m.copy( r );

    m.elements[12] = tx;
    m.elements[13] = ty;
    m.elements[14] = tz;

    commitMatrix( mesh );
}
function setRotationQuat( mesh, quat ) {
    const m = mesh.matrix;

    const tx = m.elements[12];
    const ty = m.elements[13];
    const tz = m.elements[14];

    const r = new THREE.Matrix4();
    r.makeRotationFromQuaternion( quat );

    m.copy( r );

    m.elements[12] = tx;
    m.elements[13] = ty;
    m.elements[14] = tz;

    commitMatrix( mesh );
}
function applyTranslation( mesh, dx, dy, dz ) {
    const t = new THREE.Matrix4();
    t.makeTranslation( dx, dy, dz );

    mesh.matrix.multiply( t );
    commitMatrix( mesh );
}
function applyScale( mesh, s ) {
    const matrixScale = new THREE.Matrix4();
    matrixScale.makeScale( s, s, s );

    mesh.matrix.multiply( matrixScale );
    commitMatrix( mesh );
}
function applyRotationQuat( mesh, quat ) {
    const r = new THREE.Matrix4();
    r.makeRotationFromQuaternion( quat );

    mesh.matrix.multiply( r );
    commitMatrix( mesh );
}

// Creates 2 Meshes with proper TransformControls, Origin and EventListeners
function createInitialMeshes(  ) {
    //Loader for FBX Meshes + adds Events for mouse hover
    const loader = new FBXLoader();
    const modelPath = `${meshesPath}${modelName}`;

    loader.load( modelPath,
        ( mesh ) => {
            
            mesh.scale.set( .001, .001, .001 );
            const box = new THREE.Box3().setFromObject( mesh );
            const center = new THREE.Vector3();
            box.getCenter( center );
            
            // Translates Mesh so that its Mass Center is in the Center of the Group
            mesh.position.sub( center );

            mesh.children[0].material.depthWrite = false;

            myMesh1.add( mesh );
            
            myMesh1.position.set( -1 , 0, 0 );
        
            myMesh1.addEventListener('mouseover', (event) => {
                if ( isPlaying ) return;

                let selectedObjects = [];
                selectedObjects[0] = event.target;
                outlinePersp.selectedObjects = selectedObjects;
                outlineOrtho.selectedObjects = selectedObjects;
                document.body.style.cursor = 'pointer';
                hovering = 1;
            });
            myMesh1.addEventListener('mouseout', (event) => {
                if ( isPlaying ) return;

                outlinePersp.selectedObjects = [];
                outlineOrtho.selectedObjects = [];
                document.body.style.cursor = 'default';
                hovering = 0;
            }); 
            myMesh1.addEventListener('mousedown', (event) => {
                if ( isPlaying ) return;

                if ( hovering && control1.enabled ) {
                    control1.pointerDown( control1._getPointer( event ) );
                    control1.pointerMove( control1._getPointer( event ) );
                }
            });
            myMesh1.addEventListener('mouseup', (event) => {
                if ( isPlaying ) return;
                
                control1.pointerUp( control1._getPointer( event ) );

                myMesh1.matrixWorldNeedsUpdate = true;

                matrixTransformation( startMesh, endMesh, animationMesh, progress, order );
                updateStillshot();
                updateTabDisplay( currentTransformMode, startMesh, endMesh, progress );
            });

            interactionManager.add( myMesh1 );
            scene.add( myMesh1 );
            control1.attach( myMesh1 );

            myMesh2 = myMesh1.clone();

            myMesh2.position.set( 1 , 0, 0 );

            myMesh2.addEventListener('mouseover', (event) => {
                if ( isPlaying ) return;

                let selectedObjects = [];
                selectedObjects[0] = event.target;
                outlinePersp.selectedObjects = selectedObjects;
                outlineOrtho.selectedObjects = selectedObjects;
                document.body.style.cursor = 'pointer';
                hovering = 2;
            });
            myMesh2.addEventListener('mouseout', (event) => {
                if ( isPlaying ) return;

                outlinePersp.selectedObjects = [];
                outlineOrtho.selectedObjects = [];
                document.body.style.cursor = 'default';
                hovering = 0;
            }); 
            myMesh2.addEventListener('mousedown', (event) => {
                if ( isPlaying ) return;

                if ( hovering && control2.enabled ) {
                    control2.pointerDown( control2._getPointer( event ) );
                    control2.pointerMove( control2._getPointer( event ) );
                }
            });
            myMesh2.addEventListener('mouseup', (event) => {
                if ( isPlaying ) return;

                control2.pointerUp( control2._getPointer( event ) );

                myMesh2.matrixWorldNeedsUpdate = true;

                matrixTransformation( startMesh, endMesh, animationMesh, progress, order );
                updateStillshot();
                updateTabDisplay( currentTransformMode, startMesh, endMesh, progress );
            });

            document.addEventListener('mousemove', (event) => {
                if ( isPlaying ) return;

                if ( control1.enabled ) {
                    control1.pointerMove( control1._getPointer( event ) );

                    myMesh1.matrixWorldNeedsUpdate = true;
                }

                if ( control2.enabled ) {
                    control2.pointerMove( control2._getPointer( event ) );

                    myMesh2.matrixWorldNeedsUpdate = true;
                }

                matrixTransformation( startMesh, endMesh, animationMesh, progress, order );
                updateStillshot();
                updateTabDisplay( currentTransformMode, startMesh, endMesh, progress );
            });

            interactionManager.add( myMesh2 );
            scene.add( myMesh2 );
            control2.attach( myMesh2 );

            if ( myMesh1 && myMesh2 ) createAnimationMesh(  );

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
    // scene.add( control1 );
    // scene.add( control2 );
}

function createAnimationMesh() {
    // Define start and end meshes
    startMesh = myMesh1;
    endMesh = myMesh2;

    // Saves Original Transforms for Mesh1 and 2 - I do it now to be sure they are properly set
    myMesh1.userData.original = {
        position : new THREE.Vector3( -1, 0, 0 )
    };

    myMesh2.userData.original = {
        position : new THREE.Vector3( 1, 0, 0 )
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
                // child.material.depthWrite = true;
            }
        }
    });

    animationMesh.matrixAutoUpdate = false;
    animationMesh.matrixWorldAutoUpdate = false;

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
    // animationMesh.visible = false;

    // Add the mesh to the scene

    setMeshTransparency( animationMesh, true );
    scene.add( animationMesh );

    // startMesh.children[0].children[0].material.depthTest
    updateTransformation();

    if ( myMesh1 && myMesh2 && animationMesh ) {
        cloneMaterials( startMesh );
        cloneMaterials( endMesh );
        cloneMaterials( animationMesh );
    }

    // update( startMesh );
    // update( endMesh );
    // update( animationMesh );

    console.log( "Animation mesh created:", animationMesh );
}
// Needed to have each mesh refer to a different material
function cloneMaterials( meshGroup ) {
    meshGroup.traverse( child => {
        if ( child.isMesh ) {
            child.material = Array.isArray( child.material )
                ? child.material.map( m => m.clone() )
                : child.material.clone();
        }
    });
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

    if ( ! currentCamera.isPerspectiveCamera ) {
        orbit.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };
    } else {
        orbit.mouseButtons = {
            // LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };
    }

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

// Used for toggling highlight on active view button
const frontViewButton = document.getElementById( 'frontView' );
const rightViewButton = document.getElementById( 'rightView' );
const leftViewButton = document.getElementById( 'leftView' );
const topViewButton = document.getElementById( 'topView' );
const cameraViews = [
    {
        vector: new THREE.Vector3( 0, 0, 2 ),
        button: frontViewButton
    },
    {
        vector: new THREE.Vector3( -3, 0, 0 ),
        button: leftViewButton
    },
    {
        vector: new THREE.Vector3( 3, 0, 0 ),
        button: rightViewButton
    },
    {
        vector: new THREE.Vector3( 0, 2, 0 ),
        button: topViewButton
    }
];
let activeViewButton = frontViewButton;
function getButtonFromViewVector ( v ) {
    for ( const view of cameraViews ) {
        if ( view.vector.equals( v ) ) {
            return view.button;
        }
    }
    return null;
}
function clearActiveViewButton () {
    if ( activeViewButton ) {
        activeViewButton.classList.remove( 'active' );
        activeViewButton = null;
    }
}

const smoothCameraDuration = 0.75;
// Transitions Camera from starting point to a final position, sets orbit.target = ( 0, 0, 0 )
function smoothCameraTransition ( finalPosition ) {

    if ( isTransitioning || currentCamera.position == finalPosition ) return;
    isTransitioning = true;

    const targetButton = getButtonFromViewVector( finalPosition );

    // Remove previous active button
    if ( activeViewButton && activeViewButton !== targetButton ) {
        activeViewButton.classList.remove( 'active' );
    }

    // Set new active button
    if ( targetButton ) {
        targetButton.classList.add( 'active' );
        activeViewButton = targetButton;
    } else {
        activeViewButton = null;
    }

    // Actual camera smoothing
    // const duration = 0.75;
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
        const t    = Math.min( ( now - startTime ) / ( smoothCameraDuration * 1000 ), 1 );
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
    gizmoButton.classList.toggle( 'active' );

    control1.showX = control1.showY = control1.showZ = ! control1.showX;
    control2.showX = control2.showY = control2.showZ = ! control2.showX;
}

// Transformation Matrix 
let isPlaying = false;
let progress = 0;
let duration = 3.0; // seconds
let lastTime = 0;

const animationDurationSlider = document.getElementById( 'animationDurationSlider' );
// const animationDurationText = document.getElementById( 'animationDurationText' );
animationDurationSlider.addEventListener('input', (e) => {
    // if ( isPlaying ) return;

    // Inverted ( max + min - value ) so speed goes from slower ( left ) to faster ( right )
    duration = 10 + 1 - Number( animationDurationSlider.value );
    // animationDurationText.textContent = `${ Math.round( duration ) } sec`;
});

let order = 'STR';
const transformNames = {
    T: "Translation",
    R: "Rotation",
    S: "Scale"
};

var startMesh, endMesh, animationMesh;

// UI Elements
const playButton = document.getElementById( 'playButton' );
const reverseButton = document.getElementById( 'reverseButton' );
const boomerangButton = document.getElementById( 'boomerangButton' );
const progressBar = document.getElementById( 'progressBar' );
const phaseMarkersContainer = document.getElementById( 'phaseMarkers' );
const orderContainer = document.getElementById( 'orderContainer' );
const transformUI = document.getElementById( 'transformUI' );
const gizmoButton = document.getElementById( 'gizmoToggle' );
const perspectiveButton = document.getElementById( 'perspectiveChange' );
const indipendentTransformations = document.getElementById( 'indipendentTransforms' );
const resetButtons = document.querySelectorAll( 'button[data-target][data-action]' );
const collapseButton = document.getElementById( 'collapseSideBar' );
const expandButton = document.getElementById( 'expandSideBar' );
const expandBox = document.querySelectorAll( '.expandBox' );
const collapsableClass = document.querySelectorAll( '.panelSection' );
const legendToggle = document.getElementById( 'legendToggle' );
const legendContent = document.getElementById( 'legendContent' );
const sidePanel = document.getElementById( 'sidePanel' );

let animDirection = 1;
playButton.addEventListener('click', (e) => {
    e.target.blur();
    // if ( animDirection == -1 && isPlaying ) {
    //     isPlaying = ! isPlaying;
    // }
    if ( progress == 0 ) animDirection = 1;
    playAnim();
});
reverseButton.addEventListener('click', (e) => {
    e.target.blur();
    if ( animDirection == 1 && isPlaying ) {
        isPlaying = ! isPlaying;
    }
    animDirection = -1;
    playAnim();
});
let boomerang = false
boomerangButton.addEventListener('click', (e) => {
    e.target.blur();
    boomerang = ! boomerang;
    
    boomerangButton.classList.toggle( 'active', boomerang );

    if ( boomerang && ! isPlaying ) {
        if ( progress == 1 ) animDirection = -1;
        if ( progress == 0 ) animDirection = 1;
        playAnim();
    }
});

// Updates Progress Bar, text value, animation time
function playAnim (  ) {
    if ( transparencyAnimating ) return;

    if ( scrubTransparencyTimeout ) {
        clearTimeout( scrubTransparencyTimeout );
        scrubTransparencyTimeout = null;
    }

    // If Animation is Concluded, Restart
    if ( ! isPlaying && progress == 1 && animDirection == 1 ) animDirection = -1;
    if ( ! isPlaying && progress == 0 && animDirection == -1 ) animDirection = 1;

    isPlaying = ! isPlaying;

    // If stillshots are visible, toggle animationmesh visibility ( playing: visible )
    if ( stillshotMeshes.length > 0 && ! isPlaying ) animationMesh.children[0].children[0].material.visible = false;
    else if ( stillshotMeshes.length > 0 && isPlaying ) animationMesh.children[0].children[0].material.visible = true;
    
    playButton.classList.toggle( 'active', isPlaying && animDirection == 1 || isPlaying && animDirection == -1 );
    reverseButton.classList.toggle( 'active', isPlaying && animDirection == -1 );
    if ( isPlaying ) {
        setMeshTransparency( myMesh1, true );
        setMeshTransparency( myMesh2, true );
        setMeshTransparency( animationMesh, false );
        stillshotMeshes.forEach( m => {
            setMeshTransparency( m, true );
        });
        if ( showGizmo ) toggleGizmo();
        
        control1.enabled = false;
        control2.enabled = false;

        outlinePersp.selectedObjects = [];
        outlineOrtho.selectedObjects = [];
        outlinePersp.enabled = false;
        outlineOrtho.enabled = false;
    }
    else {
        reEnableControlsOutline();
    }

    lastTime = performance.now();
}
function reEnableControlsOutline() {
    setMeshTransparency( myMesh1, false );
    setMeshTransparency( myMesh2, false );
    setMeshTransparency( animationMesh, true );
    stillshotMeshes.forEach( m => {
        setMeshTransparency( m, false );
    });

    control1.enabled = true;
    control2.enabled = true;

    outlinePersp.enabled = true;
    outlineOrtho.enabled = true;
}

let scrubTransparencyTimeout = null;
progressBar.addEventListener('input', (e) => {
    progress = parseFloat( e.target.value );
    matrixTransformation( startMesh, endMesh, animationMesh, progress, order );
    if ( isPlaying ) playAnim();

    applyPlayTransparency();

    if ( scrubTransparencyTimeout ) clearTimeout( scrubTransparencyTimeout );
    
    scrubTransparencyTimeout = setTimeout( () => {
        scrubTransparencyTimeout = null;
        // applyPauseTransparency();
        toggleTransparencySmooth();
    }, 3000 );
    // Smoothtransparency ( just to find code )
});

perspectiveButton.addEventListener('click', (e) => {
    e.target.blur();
    if ( isTransitioning ) return;
    if ( currentCamera.isPerspectiveCamera && ! topViewButton.classList.contains( 'active' ) ) {
        smoothCameraTransition( new THREE.Vector3( 0, 2, 0 ) );
        setTimeout( () => {
            perspectiveButton.textContent = currentCamera.isPerspectiveCamera ? '3D' : '2D';
            changeCamera();
        }, smoothCameraDuration * 1010 );
        [ frontViewButton, leftViewButton, rightViewButton ].forEach( button => {
            button.classList.toggle( 'hidden' );
        });
        return;
    }
    perspectiveButton.textContent = currentCamera.isPerspectiveCamera ? '3D' : '2D';
    [ frontViewButton, leftViewButton, rightViewButton ].forEach( button => {
        button.classList.toggle( 'hidden' );
    });
    changeCamera();
});

const gizmoTranslate = document.getElementById( 'gizmoTransl' );
const gizmoRotate = document.getElementById( 'gizmoRot' );
const gizmoScale = document.getElementById( 'gizmoScale' );
gizmoButton.addEventListener('click', (e) => {
    e.target.blur();
    toggleGizmo();
});
gizmoTranslate.addEventListener( 'click', (e) =>{
    e.target.blur();
    control1.setMode( 'translate' );
    control2.setMode( 'translate' );
});
gizmoRotate.addEventListener( 'click', (e) =>{
    e.target.blur();
    control1.setMode( 'rotate' );
    control2.setMode( 'rotate' );
});
gizmoScale.addEventListener( 'click', (e) =>{
    e.target.blur();
    control1.setMode( 'scale' );
    control2.setMode( 'scale' );
});

indipendentTransformations.addEventListener('click', (e) => {
    e.target.blur();
    updatePhaseMarkers();
});

phaseMarkersContainer.addEventListener('click', (e) => {
    if ( ! indipendentTransformations.checked ) return;

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
        // if ( isAnimationMode ) return;

        const action = btn.dataset.action;
        const target = btn.dataset.target;

        let mesh = null;

        if ( target === 'mesh1' ) mesh = myMesh1;
        if ( target === 'mesh2' ) mesh = myMesh2;

        // Execute the correct reset function
        if ( action === 'resetAll' ) {
            // Restore All
            if ( target === 'mesh1' ) mesh.position.set( new THREE.Vector3( -1, 0, 0 ) );
            else mesh.position.set( 1, 0, 0 );
            mesh.quaternion.identity();
            mesh.scale.set( 1, 1, 1 );
        }

        if ( action === 'resetPosition' ) {
            // Restore original position
            if ( target === 'mesh1' ) mesh.position.set( new THREE.Vector3( -1, 0, 0 ) );
            else mesh.position.set( 1, 0, 0 );
        }

        if ( action === 'resetRotation' ) {
            // Restore original rotation
            mesh.quaternion.identity();
        }

        if ( action === 'resetScale' ) {
            // Restore original scale
            mesh.scale.set( 1, 1, 1 );
        }

        // Update TransformControls after resetting
        // control1.updateMatrixWorld();
        // control2.updateMatrixWorld();

        mesh.updateMatrix();
        mesh.matrixWorldNeedsUpdate = true;

        render();
    });

});

// Collapses SideBar
collapseButton.addEventListener( 'click', (e) => {
    e.target.blur();

    sidePanel.classList.add( 'collapsed' );
    collapsableClass.forEach( ( panel ) => {
        panel.classList.add( 'collapsed' );
    });

    setTimeout( function() { expandBox[0].style.display = 'block'; }, 200 );
});
// Expands Collapsed Sidebar
expandButton.addEventListener( 'click', (e) => {
    e.target.blur();

    sidePanel.classList.remove( 'collapsed' );
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
    // if ( ! isAnimationMode || ! indipendentTransformations.checked ) return;
    if ( ! indipendentTransformations.checked ) return;

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

const transformPresets = {
    matrix: {
        shear: () => { 
            resetMesh( startMesh );
            resetMesh( endMesh );

            startMesh.rotation.set( 0, Math.PI / 2, 0 );
            endMesh.rotation.set( Math.PI / 2, 0, 0 );
            startMesh.position.set(  -1, 0, 0  );
            endMesh.position.set(  1, 0, 0 );

            startMesh.updateMatrix();
            endMesh.updateMatrix();

            startMesh.updateMatrix();
            endMesh.updateMatrix();
            startMesh.matrixWorldNeedsUpdate = true;
            endMesh.matrixWorldNeedsUpdate = true;

            smoothCameraTransition( new THREE.Vector3( 0, 0, 2 ) );
        }
    },
    euler: {
        gimbalLock: () => { 
            resetMesh( startMesh );
            resetMesh( endMesh );

            startMesh.rotation.set(
                THREE.MathUtils.degToRad( 0 ),
                THREE.MathUtils.degToRad( 90 ),
                THREE.MathUtils.degToRad( 0 )
            );
            endMesh.rotation.set(
                THREE.MathUtils.degToRad( 90 ),
                THREE.MathUtils.degToRad( 90 ),
                THREE.MathUtils.degToRad( 0 )
            );
            startMesh.position.set(  0, 0, -1  );
            endMesh.position.set(  0, 0, 1 );

            startMesh.updateMatrix();
            endMesh.updateMatrix();
            startMesh.matrixWorldNeedsUpdate = true;
            endMesh.matrixWorldNeedsUpdate = true;

            smoothCameraTransition( new THREE.Vector3( -2, 0, 0 ) );
        },
        // axisFlip: () => { ... }
    },
    axisangle: {
        axisAmbiguity: () => { 
            resetMesh( startMesh );
            resetMesh( endMesh );

            startMesh.quaternion.setFromAxisAngle(
                new THREE.Vector3( 0, 1, 0 ),
                THREE.MathUtils.degToRad( 170 )
            );
            endMesh.quaternion.setFromAxisAngle(
                new THREE.Vector3( 0, -1, 0 ),
                THREE.MathUtils.degToRad( 190 )
            );
            startMesh.position.set(  0, -1, 0  );
            endMesh.position.set(  0, 1, 0 );

            startMesh.updateMatrix();
            endMesh.updateMatrix();
            startMesh.matrixWorldNeedsUpdate = true;
            endMesh.matrixWorldNeedsUpdate = true;

            smoothCameraTransition( new THREE.Vector3( 0, 2, 0 ) );
        }
    },
    quat: {
        sp: () => { 
            resetMesh( startMesh );
            resetMesh( endMesh );

            startMesh.quaternion.setFromAxisAngle(
                new THREE.Vector3( 0, 1, 0 ),
                THREE.MathUtils.degToRad( 10 )
            );
            startMesh.quaternion.setFromAxisAngle(
                new THREE.Vector3( 0, 1, 0 ),
                THREE.MathUtils.degToRad( 350 )
            );
            startMesh.position.set(  -1, 0, 0  );
            endMesh.position.set(  1, 0, 0 );

            startMesh.updateMatrix();
            endMesh.updateMatrix();
            startMesh.matrixWorldNeedsUpdate = true;
            endMesh.matrixWorldNeedsUpdate = true;

            smoothCameraTransition( new THREE.Vector3( 0, 0, 2 ) );
        }
    },
    dualquat: {
        volumePreservation: () => { 
            resetMesh( startMesh );
            resetMesh( endMesh );
            
            startMesh.quaternion.setFromAxisAngle(
                new THREE.Vector3( 0, 1, 0 ),
                0
            );
            endMesh.quaternion.setFromAxisAngle(
                new THREE.Vector3( 0, 1, 0 ),
                Math.PI
            );
            startMesh.position.set( -1, 0, 0 );
            endMesh.position.set(  1, 0, 0 );

            startMesh.updateMatrix();
            endMesh.updateMatrix();
            startMesh.matrixWorldNeedsUpdate = true;
            endMesh.matrixWorldNeedsUpdate = true;
        }
    }
};

function resetMesh( mesh ) {
    
    mesh.position.set( 0, 0, 0 );
    mesh.rotation.set( 0, 0, 0 );
    mesh.quaternion.identity();
    mesh.scale.set( 1, 1, 1 );
    mesh.updateMatrix();
    mesh.matrixWorldNeedsUpdate = true;
}

document.querySelectorAll( '[data-preset]' ).forEach( btn => {
    btn.addEventListener( 'click', () => {
        const [ mode, name ] = btn.dataset.preset.split( '.' );
        transformPresets[ mode ][ name ]();
    });
});

function updateTransformation() {
    if ( isPlaying ) {
        const now = performance.now();
        const delta = ( now - lastTime ) / 1000;
        lastTime = now;

        progress += delta * animDirection / duration;
        if ( progress > 1 ) {
            progress = 1;
            if ( ! boomerang ) {
                isPlaying = false;
                playButton.classList.remove( 'active' );
                if ( stillshotMeshes.length > 0 ) animationMesh.children[0].children[0].material.visible = false;
                reEnableControlsOutline();
                playButton.textContent = 'Play';
                reverseButton.textContent = 'Reverse';
            }
            else {
                animDirection = -1;
            }
        }
        if ( progress < 0 ) {
            progress = 0
            if ( ! boomerang ) {
                isPlaying = false;
                playButton.classList.remove( 'active' );
                if ( stillshotMeshes.length > 0 ) animationMesh.children[0].children[0].material.visible = false;
                reEnableControlsOutline();
                playButton.textContent = 'Play';
                reverseButton.textContent = 'Reverse';
            }
            else {
                animDirection = 1;
            }
        }

        progressBar.value = progress;
        matrixTransformation( startMesh, endMesh, animationMesh, progress, order );
    }

    updateTabDisplay( currentTransformMode, startMesh, endMesh, progress );
    requestAnimationFrame( updateTransformation );
}

// Stillshot Code
let stillshotMeshes = [];
const baseMeshColor = new THREE.Color( 0.418546805942435, 0.418546805942435, 0.418546805942435 );
const stillshotStartColor = 0xffffff;
const stillshotEndColor = 0x0000ff;
const stillshotSlider = document.getElementById( "stillshotSlider" );
const stillshotBtn = document.getElementById( "stillshotBtn" );
const stillshotText = document.getElementById( "stillshotText" );

stillshotSlider.addEventListener( "input", () => {
    stillshotText.textContent = `${ Number( stillshotSlider.value ) + 2 } steps`;
    if ( stillshotMeshes.length == 0 ) return;
    animationMesh.children[0].children[0].material.visible = true;
    generateStillshot( Number( stillshotSlider.value ) );
    animationMesh.children[0].children[0].material.visible = false;
});
stillshotBtn.addEventListener( "click", () => {
    if ( stillshotMeshes.length == 0 ) generateStillshot( Number( stillshotSlider.value ) );
    else clearStillshot();
    if ( isPlaying ) applyPlayTransparency();
    else animationMesh.children[0].children[0].material.visible = ! animationMesh.children[0].children[0].material.visible;
    stillshotBtn.classList.toggle( 'active' );
});

// Cleans the scene before generating the stillshot
function clearStillshot() {
    stillshotMeshes.forEach( m => {
        scene.remove( m );
        m.traverse( c => {
            if ( c.isMesh ) {
                c.geometry?.dispose();
                if ( Array.isArray( c.material ) ) {
                    c.material.forEach( mat => mat.dispose?.() );
                } else {
                    c.material?.dispose?.();
                }
            }
        });
    });
    stillshotMeshes.length = 0;

    setMeshColor( startMesh, baseMeshColor );
    setMeshColor( endMesh, baseMeshColor );
}

function setMeshColor( meshGroup, color ) {
    meshGroup.traverse( child => {
        if ( !child.isMesh ) return;

        if ( child.material && child.material.color ) {
            child.material.color.set( color );
        }
    });
}

function applyGradientColor( mesh, t ) {
    const color = new THREE.Color().lerpColors(
        new THREE.Color( stillshotStartColor ),
        new THREE.Color( stillshotEndColor ),
        t
    );

    mesh.traverse( child => {
        if ( child.isMesh && child.material.color ) {
            child.material.color.copy( color );
        }
    });
}

function updateStillshot() {
    let count = stillshotMeshes.length;
    if ( count == 0 ) return;
    for ( let i = 0; i < count; i++ ) {
        const t = ( i + 1 ) / ( count + 1 );
        matrixTransformation(
            startMesh,
            endMesh,
            stillshotMeshes[ i ],
            t,
            order
        );
    }
}

function generateStillshot( count ) {
    
    if ( !startMesh || !endMesh || !animationMesh ) return;

    // prevents meshes accumulation
    clearStillshot();
    
    // colors start and end meshes
    setMeshColor( startMesh, stillshotStartColor );
    setMeshColor( endMesh, stillshotEndColor );

    // just to be sure
    count = Math.max( 1, Math.min( count, 10 ) );

    for ( let i = 0; i < count; i++ ) {

        const t = ( i + 1 ) / ( count + 1 );

        // clones mesh
        const clone = animationMesh.clone( true );

        // clones materials
        clone.traverse( child => {
            if ( child.isMesh ) {
                child.material = Array.isArray( child.material )
                    ? child.material.map( m => m.clone() )
                    : child.material.clone();
            }
        });

        // applies same interpolation as it would with an animation
        matrixTransformation(
            startMesh,
            endMesh,
            clone,
            t,
            order
        );

        applyGradientColor( clone, t );

        clone.children[0].children[0].material.transparent = ! clone.children[0].children[0].material.transparent;
        
        clone.visible = true;
        scene.add( clone );
        stillshotMeshes.push( clone );
    }

    console.log( stillshotMeshes );
}

function matrixTransformation( meshA, meshB, animationMesh, t, order = 'STR' ) {
    // Determine which transform mode is currently active
    // (set by your tab buttons — e.g., 'matrix', 'euler', 'axis-angle', 'quaternion', 'dual-quaternion')
    const mode = currentTransformMode || 'matrix';

    const matrixA = meshA.matrix;
    const matrixB = meshB.matrix;

    // encode
    const encodedA = encode( matrixA );
    const encodedB = encode( matrixB );

    // interpolate
    let encodedMix;

    switch ( mode ) {
        case 'matrix':
            encodedMix = mixMatrixTransform( encodedA, encodedB, t );
            break;
        case 'euler':
            encodedMix = mixEulerTransform( encodedA, encodedB, t );
            break;
        case 'axisangle':
            encodedMix = mixAxisAngleTransform( encodedA, encodedB, t );
            break;
        case 'quat':
            encodedMix = mixQuaternionTransform( encodedA, encodedB, t );
            break;
        case 'dualquat':
            encodedMix = mixDualQuaternionTransform( encodedA, encodedB, t );
            break;
        default:
            console.warn( `Unknown transform mode: ${mode}` );
            break;
    }

    // decode
    const resultMatrix = decode( encodedMix );

    // apply matrix directly
    animationMesh.matrix.copy( resultMatrix );
    commitMatrix( animationMesh );
}

let transparentOpacity = 0.25;
const opaqueOpacity = 1.0;

const transparentDepthWrite = false;
// const opaqueDepthWrite = true;
const opaqueDepthWrite = false;

const opacitySlider = document.getElementById( "opacitySlider" );
const opacityText   = document.getElementById( "opacityText" );

opacitySlider.addEventListener( "input", () => {

    transparentOpacity = Number( opacitySlider.value );

    opacityText.textContent =
        `${ Math.round( transparentOpacity * 100 ) }% opacity`;

    updateTransparency();
});

let transparencyAnimating = false;
function toggleTransparencySmooth( duration = 500 ) {

    const startTime = performance.now();

    const targets = [
        ...stillshotMeshes,
        startMesh,
        endMesh,
        animationMesh
    ].filter( Boolean );

    targets.forEach( group => {

        group.traverse( child => {
            if ( !child.isMesh ) return;

            const materials = Array.isArray( child.material )
                ? child.material
                : [ child.material ];

            materials.forEach( mat => {
                if ( !mat ) return;

                const isTransparent = mat.transparent === true;
                const from = mat.opacity;
                const to   = isTransparent
                    ? opaqueOpacity
                    : transparentOpacity;

                // if opaque, prepare it for the fade-out
                if ( !isTransparent ) {
                    mat.transparent = true;
                    mat.opacity = opaqueOpacity;
                    mat.depthWrite = transparentDepthWrite;
                }

                function animate( now ) {
                    const t = Math.min( ( now - startTime ) / duration, 1 );
                    mat.opacity = from + ( to - from ) * t;
                    mat.needsUpdate = true;

                    if ( t < 1 ) {
                        requestAnimationFrame( animate );
                        transparencyAnimating = true;
                    } else {
                        // final state
                        mat.opacity = to;
                        mat.transparent = to !== opaqueOpacity;
                        mat.depthWrite = to === opaqueOpacity
                            ? opaqueDepthWrite
                            : transparentDepthWrite;
                        mat.needsUpdate = true;
                        transparencyAnimating = false;
                    }
                }

                requestAnimationFrame( animate );
            });
        });
    });
}

function setMeshTransparency( meshGroup, transparent ) {

    meshGroup.traverse( child => {
        if ( !child.isMesh ) return;

        const materials = Array.isArray( child.material )
            ? child.material
            : [ child.material ];

        materials.forEach( mat => {
            if ( !mat ) return;

            mat.transparent = transparent;
            mat.opacity = transparent ? transparentOpacity : opaqueOpacity;
            mat.depthWrite = transparent ? transparentDepthWrite : opaqueDepthWrite;

            mat.needsUpdate = true;
        });
    });
}
// Updates all the meshes opacity value
function updateTransparency() {
    const targets = [
        ...stillshotMeshes,
        startMesh,
        endMesh,
        animationMesh
    ];

    targets.forEach( meshGroup => {
        if ( !meshGroup ) return;

        meshGroup.traverse( child => {
            if ( !child.isMesh ) return;

            const materials = Array.isArray( child.material )
                ? child.material
                : [ child.material ];

            materials.forEach( mat => {
                if ( !mat || !mat.transparent ) return;

                mat.opacity = transparentOpacity;
                mat.needsUpdate = true;
            });
        });
    });
}
function applyPlayTransparency() {
    setMeshTransparency( myMesh1, true );
    setMeshTransparency( myMesh2, true );
    setMeshTransparency( animationMesh, false );
    stillshotMeshes.forEach( m => setMeshTransparency( m, true ) );
}
function applyPauseTransparency() {
    setMeshTransparency( myMesh1, false );
    setMeshTransparency( myMesh2, false );
    setMeshTransparency( animationMesh, true );
    stillshotMeshes.forEach( m => setMeshTransparency( m, false ) );
}

// Mode tab switching
let currentTransformMode = 'matrix';

// Select all tab buttons
const tabs = document.querySelectorAll( '.tab' );
// Select all tab content boxes
const tabContents = document.querySelectorAll( '.tabContent' );
const presetSetups = document.querySelectorAll( '.presetSetup' );
tabs.forEach( tab => {
    tab.addEventListener( 'click', () => {

        // Remove active class from all tabs 
        tabs.forEach( t => t.classList.remove( 'active' ) );

        // Set this tab active 
        tab.classList.add( 'active' );

        const target = tab.dataset.tab;
        currentTransformMode = target;

        sidePanel.className = target;

        // Show only matching content 
        tabContents.forEach( box => {
            if ( box.classList.contains( 'noTabHide' ) ) return;
            if ( box.dataset.tab === target ) {
                box.classList.remove( 'hidden' );
            } else {
                box.classList.add( 'hidden' );
            }
        } );

        // Show only matching setup
        presetSetups.forEach( setup => {
            setup.classList.add( 'hidden' );
        });

        const activeSetup = document.getElementById( `${target}Setup` );
        if ( activeSetup ) {
            activeSetup.classList.remove( 'hidden' );
        }

    } );
});

// ######################### ENCODE AND DECODE FUNCTIONS ######################### //

// TRS Order is Conceptual Order, meaning 'TRS' = 'T->R->S' = S*R*T
function extractTRSFromMatrix( matrix, orderTRS ) {
    let t = new THREE.Vector3();
    
    let e = matrix.elements;
    
    t.set( e[12], e[13], e[14] );
    
    let mat3 = new THREE.Matrix3();
    mat3.set( e[0],e[1],e[2],
            e[4],e[5],e[6],
            e[8],e[9],e[10] );
    // Find scale
    let det = mat3.determinant();
    const s = Math.pow( det, 1/3 );
    // Find Rotation Matrix
    for (let i = 0; i < 9; i++) mat3.elements[i] /= s;
    mat3.transpose();
    
    switch ( orderTRS ) {
        case 'TRS':
        case 'TSR':
            t.applyMatrix3( mat3.clone().transpose() );
            t.divideScalar( s );
            break;
        case 'RST':
        case 'SRT':
            break;
        case 'RTS': t.divideScalar( s ); break;
        case 'STR': t.applyMatrix3( mat3.clone().transpose() ); break;    
        default:
            console.error("unknown transformation order");
            break;
    }

    const rot4 = new THREE.Matrix4();
    rot4.setFromMatrix3( mat3 );

    return{
        translation : t,
        rotation : rot4,
        scale : s
    };
}

// Encodes the Mesh Matrix Depending on the Current Representation and Transformation Order
function encode( matrix ) {
    switch ( currentTransformMode ) {
        case 'matrix': return matrix;
        case 'euler': return encodeEuler( matrix );
        case 'axisangle': return encodeAxisAngle( matrix );
        case 'quat': return encodeQuat( matrix );
        case 'dualquat': return encodeDualQuat( matrix );
        default: console.error("unknown transformation representation");
    }
}

// Encodes Euler Matrix into Translation, rotation and scale
function encodeEuler( matrix ) {
    const transform = extractTRSFromMatrix( matrix, eulerTRSOrder );

    let resultEuler = new THREE.Euler();    
    resultEuler.setFromRotationMatrix( transform.rotation, eulerRotationOrder, false );
    
    return {
        translation_x : transform.translation.x,
        translation_y : transform.translation.y,
        translation_z : transform.translation.z,
        rotation_x : resultEuler.x, 
        rotation_y : resultEuler.y, 
        rotation_z : resultEuler.z,
        scale: transform.scale
    }
}
function encodeAxisAngle( matrix ) {
    const transform = extractTRSFromMatrix( matrix, axisAngleTRSOrder );

    const quat = new THREE.Quaternion();
    quat.setFromRotationMatrix( transform.rotation );

    const axis = new THREE.Vector3( 0, 1, 0 );
    let angle = 0;

    if ( quat.w > 1 ) quat.normalize();

    angle = 2 * Math.acos( quat.w );
    const s = Math.sqrt( 1 - quat.w * quat.w );

    if ( s > 1e-6 ) {
        axis.set(
            quat.x / s,
            quat.y / s,
            quat.z / s
        );
    } else {
        // angle ~ 0 → arbitrary axis ( y axis, for 2D )
        axis.set( 0, 1, 0 );
    }

    return {
        translation_x : transform.translation.x,
        translation_y : transform.translation.y,
        translation_z : transform.translation.z,
        axis_x : axis.x,
        axis_y : axis.y,
        axis_z : axis.z,
        angle : angle,
        scale: transform.scale
    }
}
function encodeQuat( matrix ) {
    const transform = extractTRSFromMatrix( matrix, quatTRSOrder );

    const quat = new THREE.Quaternion();
    quat.setFromRotationMatrix( transform.rotation );
    quat.normalize();

    return {
        translation_x : transform.translation.x,
        translation_y : transform.translation.y,
        translation_z : transform.translation.z,
        quat_x : quat.x,
        quat_y : quat.y,
        quat_z : quat.z,
        quat_w : quat.w,
        scale: transform.scale
    }
}
function encodeDualQuat( matrix ) {
    const transform = extractTRSFromMatrix( matrix, dualquatTRSOrder );
    
    const t = transform.translation;

    const rotation = new THREE.Matrix4();
    rotation.extractRotation( matrix );

    const real = new THREE.Quaternion();
    real.setFromRotationMatrix( rotation );
    real.normalize();

    const tQuat = new THREE.Quaternion( t.x, t.y, t.z, 0 );
    
    // Dual quaternion = 0.5 * tQuat * real
    const dual = tQuat.clone().multiply( real );
    dual.x *= 0.5;
    dual.y *= 0.5;
    dual.z *= 0.5;
    dual.w *= 0.5;

    return {
        real_x : real.x,
        real_y : real.y,
        real_z : real.z,
        real_w : real.w,
        dual_x : dual.x,
        dual_y : dual.y,
        dual_z : dual.z,
        dual_w : dual.w,
        scale: transform.scale
    }
}

function makeMatrixFromOrder( translation, rotation, scale, orderTRS ) {
    let result = new THREE.Matrix4();
    switch ( orderTRS ) {
        case 'TRS': 
            result = scale;
            result.multiply( rotation );
            result.multiply( translation );
            break;
        case 'TSR':
            result = rotation;
            result.multiply( scale );
            result.multiply( translation );
            break;
        case 'RST':
            result = translation;
            result.multiply( scale );
            result.multiply( rotation );
            break;
        case 'SRT': 
            result = translation;
            result.multiply( rotation );
            result.multiply( scale );
            break;
        case 'RTS':
            result = scale;
            result.multiply( translation );
            result.multiply( rotation );
            break;
        case 'STR': 
            result = rotation;
            result.multiply( translation );
            result.multiply( scale );
            break;
    }
    return result;
}

function decode( encodedTransform ) {
    switch ( currentTransformMode ) {
        case 'matrix':
            return encodedTransform;
        case 'euler':
            return decodeEuler( encodedTransform );
        case 'axisangle':
            return decodeAxisAngle( encodedTransform );
        case 'quat':
            return decodeQuat( encodedTransform );
        case 'dualquat':
            return decodeDualQuat( encodedTransform );
        default:
            break;
    }
}
function decodeEuler( encodedTransform ) {
    let rotation = new THREE.Matrix4();
    rotation.makeRotationFromEuler( 
        new THREE.Euler( encodedTransform.rotation_x,
        encodedTransform.rotation_y, encodedTransform.rotation_z,
        eulerRotationOrder
    ) );

    let translation = new THREE.Matrix4();
    translation.makeTranslation( 
        new THREE.Vector3( encodedTransform.translation_x,
        encodedTransform.translation_y, encodedTransform.translation_z
    ));
    
    let scale = new THREE.Matrix4();
    scale.makeScale( encodedTransform.scale, encodedTransform.scale, encodedTransform.scale );

    return makeMatrixFromOrder( translation, rotation, scale, eulerTRSOrder );
}
function decodeAxisAngle( encodedTransform ) {
    let rotation = new THREE.Matrix4();
    const axis = new THREE.Vector3(
        encodedTransform.axis_x,
        encodedTransform.axis_y,
        encodedTransform.axis_z,
    );
    const angle = encodedTransform.angle;
    rotation.makeRotationAxis( axis, angle );

    let translation = new THREE.Matrix4();
    translation.makeTranslation( 
        new THREE.Vector3( encodedTransform.translation_x,
        encodedTransform.translation_y, encodedTransform.translation_z
    ));
    
    let scale = new THREE.Matrix4();
    scale.makeScale( encodedTransform.scale, encodedTransform.scale, encodedTransform.scale );

    return makeMatrixFromOrder( translation, rotation, scale, axisAngleTRSOrder );
}
function decodeQuat( encodedTransform ) {
    let rotation = new THREE.Matrix4();
    const quat = new THREE.Quaternion( 
        encodedTransform.quat_x, 
        encodedTransform.quat_y, 
        encodedTransform.quat_z, 
        encodedTransform.quat_w );
    rotation.makeRotationFromQuaternion( quat );

    let translation = new THREE.Matrix4();
    translation.makeTranslation( 
        new THREE.Vector3( encodedTransform.translation_x,
        encodedTransform.translation_y, encodedTransform.translation_z
    ));
    
    let scale = new THREE.Matrix4();
    scale.makeScale( encodedTransform.scale, encodedTransform.scale, encodedTransform.scale );

    return makeMatrixFromOrder( translation, rotation, scale, quatTRSOrder );
}
function decodeDualQuat( encodedTransform ) {
    const real = new THREE.Quaternion(
        encodedTransform.real_x,
        encodedTransform.real_y,
        encodedTransform.real_z,
        encodedTransform.real_w
    );

    // Checks the checkbox to see if should normalize
    if ( dualquatNormPrimal ) real.normalize();

    const dual = new THREE.Quaternion(
        encodedTransform.dual_x,
        encodedTransform.dual_y,
        encodedTransform.dual_z,
        encodedTransform.dual_w
    );
    // dual = 1/2 translation * real
    // --> translation = 2 * dual * conjugate_real
    const realConjugate = real.clone().conjugate();
    const tQuat = dual.clone().multiply( realConjugate );
    tQuat.x *= 2;
    tQuat.y *= 2;
    tQuat.z *= 2;
    tQuat.w *= 2;

    let translation = new THREE.Matrix4();
    translation.makeTranslation( new THREE.Vector3( tQuat.x, tQuat.y, tQuat.z ) );

    let rotation = new THREE.Matrix4();
    rotation.makeRotationFromQuaternion( real );

    let scale = new THREE.Matrix4();
    scale.makeScale( encodedTransform.scale, encodedTransform.scale, encodedTransform.scale );

    return makeMatrixFromOrder( translation, rotation, scale, dualquatTRSOrder );
}

function testEncodesDecodes() {
    console.log("===== TEST ENCODE / DECODE =====");

    // valori di test
    const testTranslation = new THREE.Vector3(1, 2, 3);
    const testRotationEuler = new THREE.Euler(Math.PI / 4, Math.PI / 6, Math.PI / 3, eulerRotationOrder);
    const testScale = 2;

    // costruisco la matrice di test
    const testRotationMatrix = new THREE.Matrix4().makeRotationFromEuler(testRotationEuler);
    const testTranslationMatrix = new THREE.Matrix4().makeTranslation(testTranslation.x, testTranslation.y, testTranslation.z);
    const testScaleMatrix = new THREE.Matrix4().makeScale(testScale, testScale, testScale);

    const testMatrix = makeMatrixFromOrder(testTranslationMatrix, testRotationMatrix, testScaleMatrix, eulerTRSOrder);

    console.log("Matrice originale:");
    console.table(testMatrix.elements);

    // lista di rappresentazioni da testare
    const representations = ['euler', 'axisangle', 'quat', 'dualquat'];

    representations.forEach(repr => {
        currentTransformMode = repr;  // setto la rappresentazione corrente

        console.log(`\n--- TEST ${repr.toUpperCase()} ---`);

        // encode
        const encoded = encode(testMatrix);
        console.log("Encoded:");
        console.log(encoded);

        // decode
        const decoded = decode(encoded);
        console.log("Decoded Matrix:");
        console.table(decoded.elements);

        // confronto con la matrice originale
        let diff = 0;
        const eOriginal = testMatrix.elements;
        const eDecoded = decoded.elements;

        for (let i = 0; i < 16; i++) {
            diff += Math.abs(eOriginal[i] - eDecoded[i]);
        }

        if (diff < 1e-5) {
            console.log(`${repr} : tutto ok`);
        } else {
            console.warn(`${repr} : ERRORE, differenza totale = ${diff}`);
        }
    });

    console.log("===== FINE TEST =====");
}

function mixScale( scaleA, scaleB, t, mode ) {
    // geometric interpolation: s(t) = a^(1-t) * b^t
    if ( mode === 'geometric' ) return Math.pow( scaleA, 1 - t ) * Math.pow( scaleB, t );

    // arithmetic ( default )
    return ( 1 - t ) * scaleA + t * scaleB;
}

// ##### MATRIX ##### //

// Extracts the full transformation matrix from a mesh
function getMatrixTransform( mesh ) {
  // Returns a clone to prevent unwanted reference sharing
  return mesh.matrix.clone();
}

// Interpolates linearly between two matrices
function mixMatrixTransform( matrixA, matrixB, t ) {

    // Clone and Convert to arrays for element-wise math
    const ae = matrixA.elements;
    const be = matrixB.elements;

    // Make result
    const result = new THREE.Matrix4();
    const re = result.elements;

    // Element-wise blend (syntactically compact): in threejs matrix don't support + nor * operators
    for ( let i = 0; i < 16; i++ ) {
        re[i] = ae[i] * ( 1 - t ) + be[i] * t;
    }

    return result;
}

// ##### EULER ANGLES ##### //

// Extracts position, rotation (Euler), and scale from the mesh
function getEulerTransform( mesh ) {
    return {
        position: mesh.position.clone(),
        rotation: mesh.rotation.clone(),
        scale: mesh.scale.clone()
    };
}

// Euler HTML listeners
const eulerTransformOrder = document.getElementById( 'eulerTransformOrder' );
let eulerTRSOrder = 'STR';
eulerTransformOrder.addEventListener( 'change', () => {
    eulerTRSOrder = eulerTransformOrder.value;
});
const eulerSPCheckbox = document.getElementById( 'eulerSP' );
let eulerSP = false;
eulerSPCheckbox.addEventListener( 'change', (e) => {
    e.target.blur();
    eulerSP = eulerSPCheckbox.checked;
});
const eulerRotationOrderSelector = document.getElementById( 'eulerRotationOrder' );
let eulerRotationOrder = 'XYZ';
eulerRotationOrderSelector.addEventListener( 'change', () => {
    eulerRotationOrder = eulerRotationOrderSelector.value;
});
let eulerScaleMode = 'arithmetic';
document.querySelectorAll('input[name="eulerScale"]').forEach( ( elem ) => {
    elem.addEventListener( 'change', ( event ) => {
        eulerScaleMode = event.target.value;
    });
});
const eulerRot = document.getElementById( 'eulerRot' );
let eulerRotMode = 'parallel';
document.querySelectorAll('input[name="eulerRot"]').forEach( ( elem ) => {
    elem.addEventListener( 'change', ( event ) => {
        eulerRotMode = event.target.value;
    });
});
// Interpolates between two Euler-based transforms
function mixEulerTransform( a, b, t ) {

    function lerpAngle( a1, b1, t ) {
        return a1 + ( b1 - a1 ) * t;
    }
    // Lerp with shortest path
    function lerpAngleSP( a1, b1, t ) {
        let delta = ( ( b1 - a1 + Math.PI ) % ( 2 * Math.PI ) ) - Math.PI;
        return delta < - Math.PI ? a1 + ( delta + 2 * Math.PI ) * t : a1 + delta * t;
        // if ( THREE.MathUtils.radToDeg( Math.abs( a1 - b1 ) ) < 180 ) {
        //     return a1 + ( b1 - a1 ) * t;
        // }
        
        // return  a1 + ( Math.abs( - Math.PI - b1 ) + Math.abs( Math.PI - a1 ) ) * t;
    }
    function lerpEuler( a1, b1, t ) {
        return eulerSP
            ? lerpAngleSP( a1, b1, t )
            : lerpAngle( a1, b1, t );
    }

    const tx = THREE.MathUtils.lerp( a.translation_x, b.translation_x, t );
    const ty = THREE.MathUtils.lerp( a.translation_y, b.translation_y, t );
    const tz = THREE.MathUtils.lerp( a.translation_z, b.translation_z, t );

    const scale = mixScale( a.scale, b.scale, t, eulerScaleMode );

    if ( eulerRotMode === "parallel" ) {
        // Interpolates Euler angles directly (not ideal for all cases)
        const rx = lerpEuler( a.rotation_x, b.rotation_x, t );
        const ry = lerpEuler( a.rotation_y, b.rotation_y, t );
        const rz = lerpEuler( a.rotation_z, b.rotation_z, t );

        return { 
            translation_x : tx, 
            translation_y : ty, 
            translation_z : tz,
            rotation_x: rx,
            rotation_y: ry,
            rotation_z: rz,
            scale: scale
        };
    }
    // DA SISTEMARE
    else {
        let rx = a.rotation.x;
        let ry = a.rotation.y;
        let rz = a.rotation.z;

        if ( t < 1/3 ) {
            // phase 1: ONLY X rotates
            const k = t * 3;
            if (order[0] === 'X') rx = lerpEuler(a.rotation.x, b.rotation.x, k);
            if (order[0] === 'Y') ry = lerpEuler(a.rotation.y, b.rotation.y, k);
            if (order[0] === 'Z') rz = lerpEuler(a.rotation.z, b.rotation.z, k);
        }
        else if ( t < 2/3 ) {
            // phase 1: X completed
            if (order[0] === 'X') rx = b.rotation.x;
            if (order[0] === 'Y') ry = b.rotation.y;
            if (order[0] === 'Z') rz = b.rotation.z;
            // phase 2: ONLY Y rotates
            const k = ( t - 1/3 ) * 3;
            if (order[1] === 'X') rx = lerpEuler(a.rotation.x, b.rotation.x, k);
            if (order[1] === 'Y') ry = lerpEuler(a.rotation.y, b.rotation.y, k);
            if (order[1] === 'Z') rz = lerpEuler(a.rotation.z, b.rotation.z, k);
        }
        else {
            // phase 1: X completed
            if (order[0] === 'X') rx = b.rotation.x;
            if (order[0] === 'Y') ry = b.rotation.y;
            if (order[0] === 'Z') rz = b.rotation.z;
            // phase 2: Y completed
            if (order[1] === 'X') rx = b.rotation.x;
            if (order[1] === 'Y') ry = b.rotation.y;
            if (order[1] === 'Z') rz = b.rotation.z;

            // phase 3: ONLY Z rotates
            const k = ( t - 2/3 ) * 3;
            if (order[2] === 'X') rx = lerpEuler(a.rotation.x, b.rotation.x, k);
            if (order[2] === 'Y') ry = lerpEuler(a.rotation.y, b.rotation.y, k);
            if (order[2] === 'Z') rz = lerpEuler(a.rotation.z, b.rotation.z, k);
        }

        // Compose the final Euler
        const rot = new THREE.Euler( rx, ry, rz, eulerRotationOrder );

        return { position: pos, rotation: rot, scale: scale };
    }
}

// ##### AXIS-ANGLE ##### //

const axisAngleTransformOrder = document.getElementById( 'axisangleTransformOrder' );
let axisAngleTRSOrder = 'STR';
axisAngleTransformOrder.addEventListener( 'change', ( e ) => {
    axisAngleTRSOrder = axisAngleTransformOrder.value;
});
const spAxisAngleCheckbox = document.getElementById( 'axisangleSP' );
const spAxisAngleTypeDiv  = document.getElementById( 'axisangleSPType' );
let axisangleSPMode = 'none';
spAxisAngleCheckbox.addEventListener( 'change', (e) => {
    e.target.blur();
    spAxisAngleTypeDiv.classList.toggle( 'hidden', ! spAxisAngleCheckbox.checked );
    if ( spAxisAngleTypeDiv.classList.contains( 'hidden' ) ) axisangleSPMode = 'none';
});
document.querySelectorAll('input[name="axisangleSPType"]').forEach( ( elem ) => {
    if ( spAxisAngleTypeDiv.classList.contains( 'hidden' ) ) axisangleSPMode = 'none';

    elem.addEventListener( 'change', ( event ) => {
        axisangleSPMode = event.target.value;
    });
});
let axisangleScaleMode = 'arithmetic';
document.querySelectorAll('input[name="axisangleScale"]').forEach( ( elem ) => {
    elem.addEventListener( 'change', ( event ) => {
        axisangleScaleMode = event.target.value;
    });
});
let axisangleInterpMode = 'nlerp';
document.querySelectorAll('input[name="axisangleInterp"]').forEach( ( elem ) => {
    elem.addEventListener( 'change', ( event ) => {
        axisangleInterpMode = event.target.value;
    });
});

// Interpolates between two axis-angle transforms
function mixAxisAngleTransform( a, b, t ) {

    function normalizeAngle0To2PI( a ) {
        a = a % ( Math.PI * 2 );
        if ( a < 0 ) a += Math.PI * 2;
        return a;
    }
    function shortestAngleDelta( a, b ) {
        let d = b - a;
        if ( d > Math.PI )  d -= Math.PI * 2;
        if ( d < -Math.PI ) d += Math.PI * 2;
        return d;
    }

    const tx = THREE.MathUtils.lerp( a.translation_x, b.translation_x, t );
    const ty = THREE.MathUtils.lerp( a.translation_y, b.translation_y, t );
    const tz = THREE.MathUtils.lerp( a.translation_z, b.translation_z, t );

    const scale = mixScale( a.scale, b.scale, t, axisangleScaleMode );

    const axisA = new THREE.Vector3( a.axis_x, a.axis_y, a.axis_z );
    const axisB = new THREE.Vector3( b.axis_x, b.axis_y, b.axis_z );

    // ---------- NO SHORTEST PATH ----------
    if ( axisangleSPMode === 'none' ) {
        const axis = new THREE.Vector3().lerpVectors( axisA, axisB, t ).normalize();
        const angle = ( 1 - t ) * a.angle + t * b.angle;

        return {
            translation_x: tx,
            translation_y: ty,
            translation_z: tz,
            axis_x: axis.x,
            axis_y: axis.y,
            axis_z: axis.z,
            angle: angle,
            scale: scale
        };
    }

    // ---------- PER ANGLE ----------
    if ( axisangleSPMode === 'perAngle' ) {
        const axis = new THREE.Vector3().lerpVectors( axisA, axisB, t ).normalize();

        const a0 = normalizeAngle0To2PI( a.angle );
        const b0 = normalizeAngle0To2PI( b.angle );

        const delta = shortestAngleDelta( a0, b0 );
        const angle = a0 + delta * t;

        return {
            translation_x: tx,
            translation_y: ty,
            translation_z: tz,
            axis_x: axis.x,
            axis_y: axis.y,
            axis_z: axis.z,
            angle: angle,
            scale: scale
        };
    }

    // ---------- GLOBAL ----------
    if ( axisangleSPMode === 'global' ) {

        const qa = new THREE.Quaternion().setFromAxisAngle( axisA, a.angle ).normalize();
        const qb = new THREE.Quaternion().setFromAxisAngle( axisB, b.angle ).normalize();

        // forces global shortest path
        if ( qa.dot( qb ) < 0 ) {
            qb.x = -qb.x;
            qb.y = -qb.y;
            qb.z = -qb.z;
            qb.w = -qb.w;
        }

        // N-Lerp or S-Lerp
        const q =
            axisangleInterpMode === 'slerp'
                ? new THREE.Quaternion().slerpQuaternions( qa, qb, t )
                : new THREE.Quaternion(
                    qa.x * ( 1 - t ) + qb.x * t,
                    qa.y * ( 1 - t ) + qb.y * t,
                    qa.z * ( 1 - t ) + qb.z * t,
                    qa.w * ( 1 - t ) + qb.w * t
                ).normalize();

        // Re-convert to axis-angle
        let angle = 2 * Math.acos( Math.min( 1, Math.abs( q.w ) ) );
        const s = Math.sqrt( 1 - q.w * q.w );
        
        let axis = new THREE.Vector3( 0, 1, 0 );
        if ( s > 1e-6 ) {
            axis.set( q.x / s, q.y / s, q.z / s );
        }

        return {
            translation_x: tx,
            translation_y: ty,
            translation_z: tz,
            axis_x: axis.x,
            axis_y: axis.y,
            axis_z: axis.z,
            angle: angle,
            scale: scale
        };
    }
}

// ##### QUATERNIONS ##### //

const quatTransformOrder = document.getElementById( 'quatTransformOrder' );
let quatTRSOrder = 'STR';
quatTransformOrder.addEventListener( 'change', ( e ) => {
    quatTRSOrder = quatTransformOrder.value;
});
const quatSPCheckbox = document.getElementById( 'quatSP' );
let quatSP = true;
quatSPCheckbox.addEventListener( 'change', (e) => {
    e.target.blur();
    quatSP = quatSPCheckbox.checked;
});
let quatScaleMode = 'arithmetic';
document.querySelectorAll('input[name="quatScale"]').forEach( ( elem ) => {
    elem.addEventListener( 'change', ( event ) => {
        quatScaleMode = event.target.value;
    });
});
let quatInterpMode = 'nlerp';
document.querySelectorAll('input[name="quatInterp"]').forEach( ( elem ) => {
    elem.addEventListener( 'change', ( event ) => {
        quatInterpMode = event.target.value;
    });
});

function mixQuaternionTransform( a, b, t ) {

    const tx = THREE.MathUtils.lerp( a.translation_x, b.translation_x, t );
    const ty = THREE.MathUtils.lerp( a.translation_y, b.translation_y, t );
    const tz = THREE.MathUtils.lerp( a.translation_z, b.translation_z, t );
    
    const scale = mixScale( a.scale, b.scale, t, quatScaleMode );

    let qa = new THREE.Quaternion( a.quat_x, a.quat_y, a.quat_z, a.quat_w ).normalize();
    let qb = new THREE.Quaternion( b.quat_x, b.quat_y, b.quat_z, b.quat_w ).normalize();

    // ---------- SHORTEST PATH ----------
    if ( quatSP ) {
        if ( qa.dot( qb ) < 0 ) {
            qb.x *= -1;
            qb.y *= -1;
            qb.z *= -1;
            qb.w *= -1;
        }
    }

    let q;

    // ---------- SLERP ----------
    if ( quatInterpMode === 'slerp' ) {
        q = new THREE.Quaternion().slerpQuaternions( qa, qb, t );
    }

    // ---------- NLERP ----------
    else if ( quatInterpMode === 'nlerp' ) {
        q = new THREE.Quaternion(
            qa.x * ( 1 - t ) + qb.x * t,
            qa.y * ( 1 - t ) + qb.y * t,
            qa.z * ( 1 - t ) + qb.z * t,
            qa.w * ( 1 - t ) + qb.w * t
        ).normalize();
    }

    // ---------- LERP ----------
    else if ( quatInterpMode === 'lerp' ) {
        q = new THREE.Quaternion(
            qa.x * ( 1 - t ) + qb.x * t,
            qa.y * ( 1 - t ) + qb.y * t,
            qa.z * ( 1 - t ) + qb.z * t,
            qa.w * ( 1 - t ) + qb.w * t
        );
        // NO normalize()
    }

    return {
        translation_x: tx,
        translation_y: ty,
        translation_z: tz,
        quat_x: q.x,
        quat_y: q.y,
        quat_z: q.z,
        quat_w: q.w,
        scale: scale
    };
}

// ##### DUAL QUATERNIONS ##### //

const dualquatTransformOrder = document.getElementById( 'dualquatTransformOrder' );
let dualquatTRSOrder = 'STR';
dualquatTransformOrder.addEventListener( 'change', ( e ) => {
    dualquatTRSOrder = dualquatTransformOrder.value;
});
const dualquatSPCheckbox = document.getElementById( 'dualquatSP' );
let dualquatSP = true;
dualquatSPCheckbox.addEventListener( 'change', (e) => {
    e.target.blur();
    dualquatSP = dualquatSPCheckbox.checked;
});
const dualquatNormPrimalCheckbox  = document.getElementById( 'dualquatNormPrimal' );
let dualquatNormPrimal = true;
dualquatNormPrimalCheckbox.addEventListener( 'change', (e) => {
    e.target.blur();
    dualquatNormPrimal = dualquatNormPrimalCheckbox.checked;
});
const dualquatNormDualCheckbox  = document.getElementById( 'dualquatNormDual' );
let dualquatNormDual = true;
dualquatNormDualCheckbox.addEventListener( 'change', (e) => {
    e.target.blur();
    dualquatNormDual = dualquatNormDualCheckbox.checked;
});
const dualquatReHortDualCheckbox = document.getElementById( 'dualquatReHortDual' );
let dualquatReHortDual = true;
dualquatReHortDualCheckbox.addEventListener( 'change', (e) => {
    e.target.blur();
    dualquatReHortDual = dualquatReHortDualCheckbox.checked;
});
let dualquatScaleMode = 'arithmetic';
document.querySelectorAll('input[name="dualquatScale"]').forEach( ( elem ) => {
    elem.addEventListener( 'change', ( event ) => {
        dualquatScaleMode = event.target.value;
    });
});
// Linearly blends dual quaternions (normalized afterwards)
function mixDualQuaternionTransform( a, b, t ) {

    const primalA = new THREE.Quaternion( a.real_x, a.real_y, a.real_z, a.real_w );
    const dualA = new THREE.Quaternion( a.dual_x, a.dual_y, a.dual_z, a.dual_w );

    let primalB = new THREE.Quaternion( b.real_x, b.real_y, b.real_z, b.real_w );
    let dualB = new THREE.Quaternion( b.dual_x, b.dual_y, b.dual_z, b.dual_w );

    const scale = mixScale( a.scale, b.scale, t, dualquatScaleMode );

    // ---------- SHORTEST PATH ----------
    if ( dualquatSP ) {
        // Flip both if they point in opposite directions
        if ( primalA.dot( primalB ) < 0 ) {
            primalB.x = -primalB.x; 
            primalB.y = -primalB.y; 
            primalB.z = -primalB.z; 
            primalB.w = -primalB.w;
            dualB.x = -dualB.x; 
            dualB.y = -dualB.y; 
            dualB.z = -dualB.z; 
            dualB.w = -dualB.w;
        }
    }

    // Pure linear interpolation of both components
    const primal = new THREE.Quaternion(
        primalA.x * ( 1 - t ) + primalB.x * t,
        primalA.y * ( 1 - t ) + primalB.y * t,
        primalA.z * ( 1 - t ) + primalB.z * t,
        primalA.w * ( 1 - t ) + primalB.w * t
    );

    const dual = new THREE.Quaternion(
        dualA.x * ( 1 - t ) + dualB.x * t,
        dualA.y * ( 1 - t ) + dualB.y * t,
        dualA.z * ( 1 - t ) + dualB.z * t,
        dualA.w * ( 1 - t ) + dualB.w * t
    );

    // Normalize result
    const norm = Math.sqrt( primal.x**2 + primal.y**2 + primal.z**2 + primal.w**2 );
    if ( dualquatNormPrimal ) {
        primal.x /= norm;
        primal.y /= norm;
        primal.z /= norm;
        primal.w /= norm;
    }
    if ( dualquatNormDual ) {
        dual.x /= norm;
        dual.y /= norm;
        dual.z /= norm;
        dual.w /= norm;
    }

    // Re-Hortogonalize dual
    if ( dualquatReHortDual ) {
        const dot =
            primal.x * dual.x +
            primal.y * dual.y +
            primal.z * dual.z +
            primal.w * dual.w;

        dual.x -= primal.x * dot;
        dual.y -= primal.y * dot;
        dual.z -= primal.z * dot;
        dual.w -= primal.w * dot;
    }

    return {
        real_x: primal.x,
        real_y: primal.y,
        real_z: primal.z,
        real_w: primal.w,
        dual_x: dual.x,
        dual_y: dual.y,
        dual_z: dual.z,
        dual_w: dual.w,
        scale: scale
    };
}

// ##### END INTERPOLATION SECTION ##### //


// Updates the Content of the Selected Tab
function updateTabDisplay( mode, meshA, meshB, t ) {

    // Encode
    const encodedA = encode( meshA.matrix );
    const encodedB = encode( meshB.matrix );

    // Mix
    let encodedMix;
    switch ( mode ) {
        case 'matrix':
            encodedMix = mixMatrixTransform( encodedA, encodedB, t );
            break;
        case 'euler':
            encodedMix = mixEulerTransform( encodedA, encodedB, t );
            break;
        case 'axisangle':
            encodedMix = mixAxisAngleTransform( encodedA, encodedB, t );
            break;
        case 'quat':
            encodedMix = mixQuaternionTransform( encodedA, encodedB, t );
            break;
        case 'dualquat':
            encodedMix = mixDualQuaternionTransform( encodedA, encodedB, t );
            break;
        default:
            console.warn( `Unknown transform mode: ${mode}` );
            encodedMix = encodedA; // fallback
            break;
    }

    // Decode
    const resultMatrix = decode( encodedMix );

    // Update UI
    updateTabElements( mode, encodedA, encodedB, encodedMix, resultMatrix, t );
}

// Separate function for UI updates
function updateTabElements( mode, encodedA, encodedB, encodedMix, resultMatrix, t ) {
    const tabA    = document.getElementById( `${mode}A` );
    const tabB    = document.getElementById( `${mode}B` );
    const tabMix  = document.getElementById( `${mode}Mix` );
    const tabSetM = document.getElementById( `${mode}SetM` );

    if ( tabA )   tabA.innerHTML   = buildSummaryHTML( 'Start', encodedA, mode );
    if ( tabB )   tabB.innerHTML   = buildSummaryHTML( 'End', encodedB, mode );
    if ( tabMix ) tabMix.innerHTML = buildSummaryHTML( `Mix (t=${t.toFixed(2)})`, encodedMix, mode );
    if ( tabSetM ) tabSetM.innerHTML = buildMatrixHTML( resultMatrix );
}

// Builds the HTML for the result matrix
function buildMatrixHTML( matrix ) {
    return `<b>Set Matrix:</b><br>${formatMatrix( matrix )}`;
}
// Builds the HTML summary for encoded data based on mode
function buildSummaryHTML( label, encoded, mode ) {
    let html = `<b>${label}:</b><br>`;
    
    switch ( mode ) {
        case 'matrix':
            html += formatMatrix( encoded );
            break;
            
        case 'euler':
            html += formatTranslation( encoded );
            html += formatEulerRotation( encoded );
            html += formatScale( encoded );
            break;
            
        case 'axisangle':
            html += formatTranslation( encoded );
            html += formatAxisAngle( encoded );
            html += formatScale( encoded );
            break;
            
        case 'quat':
            html += formatTranslation( encoded );
            html += formatQuaternion( encoded );
            html += formatScale( encoded );
            break;
            
        case 'dualquat':
            html += formatDualQuaternion( encoded );
            html += formatScale( encoded );
            break;
    }
    
    return html;
}

// ========== FORMATTING FUNCTIONS ==========

function formatTranslation( encoded ) {
    const tx = cut( encoded.translation_x );
    const ty = cut( encoded.translation_y );
    const tz = cut( encoded.translation_z );
    return `pos = (${tx}, ${ty}, ${tz})<br>`;
}

function formatEulerRotation( encoded ) {
    const degX = THREE.MathUtils.radToDeg( encoded.rotation_x );
    const degY = THREE.MathUtils.radToDeg( encoded.rotation_y );
    const degZ = THREE.MathUtils.radToDeg( encoded.rotation_z );
    return `rot = (${cut(degX)}°, ${cut(degY)}°, ${cut(degZ)}°)<br>`;
}

function formatAxisAngle( encoded ) {
    const ax = cut( encoded.axis_x );
    const ay = cut( encoded.axis_y );
    const az = cut( encoded.axis_z );
    const deg = THREE.MathUtils.radToDeg( encoded.angle );
    let html = `axis = (${ax}, ${ay}, ${az})<br>`;
    html += `angle = ${cut(deg)}°<br>`;
    return html;
}

function formatQuaternion( encoded ) {
    const qx = cut( encoded.quat_x );
    const qy = cut( encoded.quat_y );
    const qz = cut( encoded.quat_z );
    const qw = cut( encoded.quat_w );
    return `quat = (${qx}, ${qy}, ${qz}, ${qw})<br>`;
}

function formatDualQuaternion( encoded ) {
    const rx = cut( encoded.real_x );
    const ry = cut( encoded.real_y );
    const rz = cut( encoded.real_z );
    const rw = cut( encoded.real_w );
    const dx = cut( encoded.dual_x );
    const dy = cut( encoded.dual_y );
    const dz = cut( encoded.dual_z );
    const dw = cut( encoded.dual_w );
    let html = `real = (${rx}, ${ry}, ${rz}, ${rw})<br>`;
    html += `dual = (${dx}, ${dy}, ${dz}, ${dw})<br>`;
    return html;
}

function formatScale( encoded ) {
    const s = cut( encoded.scale );
    return `scale = ${s}<br>`;
}

function formatMatrix( matrix ) {
    if ( !( matrix instanceof THREE.Matrix4 ) ) {
        return 'Invalid matrix';
    }
    
    const e = matrix.elements.map( n => cutFixed( n ) );
    let html = '';
    
    // Display matrix in row-major order (more readable)
    for ( let r = 0; r < 4; r++ ) {
        const row = [];
        for ( let c = 0; c < 4; c++ ) {
            row.push( e[ c * 4 + r ] ); // column-major → row-major
        }
        html += `[${row.join(' ')}]<br>`;
    }
    
    return html;
}

// ========== UTILITY FUNCTIONS ==========

function cut( n, decimals = 3 ) {
    if ( isNaN( n ) || n === null ) return "0";
    const str = n.toFixed( decimals );
    // Remove trailing zeros and unnecessary decimal point
    return str.replace( /(\.\d*?[1-9])0+$/, '$1' ).replace( /\.$/, '' );
}

function cutFixed( n, decimals = 3, width = 7 ) {
    if ( isNaN( n ) || n === null ) return " ".repeat( width );
    let s = n.toFixed( decimals );
    // Pad left to ensure uniform width
    if ( s.length < width ) {
        s = " ".repeat( width - s.length ) + s;
    }
    return s;
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
            event.preventDefault();
            if ( progress == 0 ) animDirection = 1;
            playAnim();
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
    // if ( isAnimationMode ) return;

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
            currentCamera.isOrthographicCamera ? activeControl.axis = 'Y' : activeControl.axis = 'XYZE';
            event.preventDefault(); // prevents contextual menu
            break;
    }

    // Enables TransformControls then calls pointerDown
    activeControl.enabled = true;
    orbit.enabled = false;
    
    activeControl.pointerDown( activeControl._getPointer( event ) );
    
    isDragging = true;
});
const minScale = 0.3;
function clampScale( object ) {
    object.scale.x = Math.max( minScale, object.scale.x );
    object.scale.y = Math.max( minScale, object.scale.y );
    object.scale.z = Math.max( minScale, object.scale.z );

    object.updateMatrix();
}

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

window.addEventListener( "DOMContentLoaded", () => {
    onWindowResize();
});

window.addEventListener( 'resize', onWindowResize, false );
function onWindowResize() {
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;

    if ( width === 0 || height === 0 ) {
        console.warn("resize skipped: layout has zero size");
        return;
    }

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
// testEncodesDecodes();

render();
animate();