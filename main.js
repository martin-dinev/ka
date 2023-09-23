import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GUI} from "three/addons/libs/lil-gui.module.min";
import {TransformControls} from "three/addons/controls/TransformControls";
import {Toolbar} from "./Toolbar";
import {mergeVertices} from "three/addons/utils/BufferGeometryUtils";
import { Points} from "three";

if (!WebGL.isWebGLAvailable()) {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
} else {

    let container, stats, gui;
    let camera, scene, renderer;
    let controls, transformControls;
    let editorSignals, selection;
    let showEditPoints = false;


    // const pointer = new THREE.Vector2();
    // const onUpPosition = new THREE.Vector2();
    // const onDownPosition = new THREE.Vector2();

    const objectsGroup = new THREE.Group();
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 20;

    const mouse = new THREE.Vector2();


    const onDownPosition = new THREE.Vector2();
    const onUpPosition = new THREE.Vector2();
    const onDoubleClickPosition = new THREE.Vector2();


    const params = {
        number: 10,
        addCube: addCube,
        export: () => {
            console.log("wait");
        },
    };

    init();

    function init() {


        container = document.getElementById('container');

        renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        scene = new THREE.Scene();
        scene.add(objectsGroup);
        scene.background = new THREE.Color(0x555555);
        scene.add(new THREE.AxesHelper(2000));

        camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
        camera.position.set(300, 250, 1000);
        scene.add(camera);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.damping = 2;
        controls.addEventListener('change', render);

        initSignals();

        rayCasting();


        const toolbar = new Toolbar(editorSignals);
        container.appendChild(toolbar.dom);

        addSceneLight();


        addGui();


        transformControls = new TransformControls(camera, renderer.domElement);
        addTransformControls(transformControls);
        // transformControl = new TransformControls( camera, renderer.domElement );
        // transformControl.addEventListener( 'change', render );
        // transformControl.addEventListener( 'dragging-changed', function ( event ) {controls.enabled = ! event.value;} );
        // scene.add( transformControl );

        // transformControl.addEventListener( 'objectChange', function () {} );

        // document.addEventListener( 'pointerdown', onPointerDown );
        // document.addEventListener( 'pointerup', onPointerUp );
        // document.addEventListener( 'pointermove', onPointerMove );
        container.addEventListener('mousedown', onMouseDown);
        window.addEventListener('resize', onWindowResize);
        render();

    }

    // function onPointerDown( event ) {
    //
    //     onDownPosition.x = event.clientX;
    //     onDownPosition.y = event.clientY;
    //
    // }
    //
    // function onPointerUp( event ) {
    //
    //     onUpPosition.x = event.clientX;
    //     onUpPosition.y = event.clientY;
    //
    //     if ( onDownPosition.distanceTo( onUpPosition ) === 0 ) {
    //
    //         transformControls.detach();
    //         render();
    //
    //     }
    //
    // }
    //
    // function onPointerMove( event ) {
    //
    //     pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    //     pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    //
    //     raycaster.setFromCamera( pointer, camera );
    //
    //     const intersects = [];
    //         // raycaster.intersectObjects( splineHelperObjects, false );
    //
    //     if ( intersects.length > 0 ) {
    //
    //         const object = intersects[ 0 ].object;
    //
    //         if ( object !== transformControl.object ) {
    //
    //             transformControl.attach( object );
    //
    //         }
    //
    //     }
    //
    // }

    function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

        render();

    }

    function render() {

        renderer.render(scene, camera);

    }

    function addCube() {
        let group = new THREE.Group();
        // let verticiesPositions = new Float32Array([
        //     0, 0, 0,
        //     0, 0, 250,
        //     0, 250, 0,
        //     0, 250, 250,
        //     250, 0, 0,
        //     250, 0, 250,
        //     250, 250, 0,
        //     250, 250, 250
        // ]);
        // let index = [
        //     0, 1, 2, 3, 2, 1,
        //     6, 5, 4, 5, 6, 7,
        //     4, 1, 0, 1, 4, 5,
        //     2, 3, 6, 7, 6, 3,
        //     0, 2, 4, 6, 4, 2,
        //     5, 3, 1, 3, 5, 7
        // ];

        let verticies = new THREE.Group();
        //
        // let cubeGeometry = new THREE.BufferGeometry();
        // cubeGeometry.setIndex(index);
        // cubeGeometry.setAttribute('position', new THREE.BufferAttribute(verticiesPositions, 3));
        //
        // cubeGeometry.translate(250, 250, 250);
        // group.add(new THREE.Mesh(cubeGeometry, new THREE.MeshBasicMaterial({
        //     color: Math.random() * 0xffffff,
        //     // wireframe: true,
        // })));


        let cubeGeometry = new THREE.BoxGeometry(250, 250, 250);
        cubeGeometry.deleteAttribute('normal');
        cubeGeometry.deleteAttribute('uv');
        cubeGeometry = mergeVertices(cubeGeometry);


        // const triangles = cubeGeometry.index.length / 3;
        // const positions = cubeGeometry.getAttribute( 'position' ).array;
        // const normals = new Float32Array( triangles * 3 * 3 );
        // const colors = new Float32Array( triangles * 3 * 3 );
        //
        // const color = new THREE.Color();
        //
        // const pA = new THREE.Vector3();
        // const pB = new THREE.Vector3();
        // const pC = new THREE.Vector3();
        //
        // const cb = new THREE.Vector3();
        // const ab = new THREE.Vector3();
        //
        // for ( let i = 0; i < positions.length; i += 9 ) {
        //
        //
        //     pA.set( positions[ i ], positions[ i + 1 ], positions[ i + 2 ] );
        //     pB.set( positions[ i + 3 ], positions[ i + 4 ], positions[ i + 5 ] );
        //     pC.set( positions[ i + 6 ], positions[ i + 7 ], positions[ i + 8 ] );
        //
        //     cb.subVectors( pC, pB );
        //     ab.subVectors( pA, pB );
        //     cb.cross( ab );
        //
        //     cb.normalize();
        //
        //     const nx = cb.x;
        //     const ny = cb.y;
        //     const nz = cb.z;
        //
        //     normals[ i ] = nx;
        //     normals[ i + 1 ] = ny;
        //     normals[ i + 2 ] = nz;
        //
        //     normals[ i + 3 ] = nx;
        //     normals[ i + 4 ] = ny;
        //     normals[ i + 5 ] = nz;
        //
        //     normals[ i + 6 ] = nx;
        //     normals[ i + 7 ] = ny;
        //     normals[ i + 8 ] = nz;
        //
        //     // colors
        //
        //     // const vx = ( x / n ) + 0.5;
        //     // const vy = ( y / n ) + 0.5;
        //     // const vz = ( z / n ) + 0.5;
        //     //
        //     // color.setRGB( vx, vy, vz );
        //     //
        //     // colors[ i ] = color.r;
        //     // colors[ i + 1 ] = color.g;
        //     // colors[ i + 2 ] = color.b;
        //     //
        //     // colors[ i + 3 ] = color.r;
        //     // colors[ i + 4 ] = color.g;
        //     // colors[ i + 5 ] = color.b;
        //     //
        //     // colors[ i + 6 ] = color.r;
        //     // colors[ i + 7 ] = color.g;
        //     // colors[ i + 8 ] = color.b;
        //
        // }
        //
        // // geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
        // cubeGeometry.setAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
        // // geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
        //

        let normlas = new Float32Array(cubeGeometry.attributes.position.array.length);

        for (let i = 0 ; i < cubeGeometry.attributes.position.array.length; i += 3) {
            let pA = new THREE.Vector3(cubeGeometry.attributes.position.array[i], cubeGeometry.attributes.position.array[i + 1], cubeGeometry.attributes.position.array[i + 2]);
             pA.normalize();
            normlas[i] = pA.x;
            normlas[i + 1] = pA.y;
            normlas[i + 2] = pA.z;
        }

        cubeGeometry.setAttribute('normal', new THREE.BufferAttribute(normlas, 3));

        cubeGeometry.computeBoundingSphere();















        let coordinates = cubeGeometry.getAttribute('position').array;
        // console.log(cubeGeometry.getAttribute('position'));
        for (let i = 0; i < coordinates.length; i += 3) {
            let point = new THREE.Vector3(coordinates[i], coordinates[i + 1], coordinates[i + 2]);
            let helper_object = new Points((new THREE.BufferGeometry()).setFromPoints([new THREE.Vector3(0, 0, 0)]),
                new THREE.PointsMaterial({
                    color: 0xff00ff,
                    size: 15,
                    sizeAttenuation: false
                })

                );
            helper_object.userData.index = i / 3;
            helper_object.position.copy(point);
            helper_object.visible = false;
            verticies.add(helper_object);
        }

        // verticies = new THREE.Points(cubeGeometry, new THREE.PointsMaterial({
        //     color: 0xff00ff, size: 15, sizeAttenuation: false
        // }));

        // console.log(verticies);

        let cubeMesh = new THREE.MeshNormalMaterial({color: Math.random() * 0xffffff, wireframe: false,});
        // cubeGeometry = ;
        let cube = new THREE.Mesh(cubeGeometry, cubeMesh);

        // verticies.visible = false;

        group.add(verticies);
        group.add(cube);
        group.translateX(125);
        group.translateY(125);
        group.translateZ(125);
        objectsGroup.add(group);
        render();
    }

    function addSceneLight() {
        scene.add(new THREE.AmbientLight(0xf0f0f0, 3));
        const light = new THREE.SpotLight(0xffffff, 4.5);
        light.position.set(0, 1500, 200);
        light.angle = Math.PI * 0.2;
        light.decay = 0;
        light.castShadow = true;
        light.shadow.camera.near = 200;
        light.shadow.camera.far = 2000;
        light.shadow.bias = -0.000222;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        scene.add(light);
    }

    function addGui() {
        gui = new GUI();
        gui.add(params, 'number');
        gui.add(params, 'addCube');
        gui.add(params, 'export');
    }

    function initSignals() {
        const Signal = signals.Signal; // eslint-disable-line no-undef

        editorSignals = {

            // script

            // editScript: new Signal(),

            // player

            // startPlayer: new Signal(),
            // stopPlayer: new Signal(),

            // vr

            // toggleVR: new Signal(),
            // exitedVR: new Signal(),

            // notifications

            // editorCleared: new Signal(),

            // savingStarted: new Signal(),
            // savingFinished: new Signal(),

            transformModeChanged: new Signal(),
            snapChanged: new Signal(),
            spaceChanged: new Signal(),
            editPointsChanged: new Signal(), // rendererCreated: new Signal(),
            // rendererUpdated: new Signal(),

            // sceneBackgroundChanged: new Signal(),
            // sceneEnvironmentChanged: new Signal(),
            // sceneFogChanged: new Signal(),
            // sceneFogSettingsChanged: new Signal(),
            // sceneGraphChanged: new Signal(),
            // sceneRendered: new Signal(),
            //
            // cameraChanged: new Signal(),
            // cameraResetted: new Signal(),

            // geometryChanged: new Signal(),

            selectionChanged: new Signal(), // objectFocused: new Signal(),
            //
            // objectAdded: new Signal(),
            // objectChanged: new Signal(),
            // objectRemoved: new Signal(),

            // cameraAdded: new Signal(),
            // cameraRemoved: new Signal(),

            // helperAdded: new Signal(),
            // helperRemoved: new Signal(),

            // materialAdded: new Signal(),
            // materialChanged: new Signal(),
            // materialRemoved: new Signal(),

            // scriptAdded: new Signal(),
            // scriptChanged: new Signal(),
            // scriptRemoved: new Signal(),

            // windowResize: new Signal(),

            // showGridChanged: new Signal(),
            // showHelpersChanged: new Signal(),
            // refreshSidebarObject3D: new Signal(),
            // historyChanged: new Signal(),

            // viewportCameraChanged: new Signal(),
            // viewportShadingChanged: new Signal(),

            intersectionsDetected: new Signal(),

        };

        editorSignals.transformModeChanged.add(function (mode) {

            transformControls.setMode(mode);

        });

        editorSignals.snapChanged.add(function (dist) {

            transformControls.setTranslationSnap(dist);

        });

        editorSignals.spaceChanged.add(function (space) {

            transformControls.setSpace(space);

        });

        editorSignals.editPointsChanged.add(function (newShowEditPoints) {
            showEditPoints = newShowEditPoints;
            editorSignals.selectionChanged.dispatch(selection);
            render();
        });
    }

    let objectPositionOnDown = null;
    let objectRotationOnDown = null;
    let objectScaleOnDown = null;

    function addTransformControls() {

        transformControls.addEventListener('change', function () {

            const object = transformControls.object;

            if (object !== undefined) {

                // box.setFromObject( object, true );

                // const helper = editor.helpers[ object.id ];

                // if ( helper !== undefined && helper.isSkeletonHelper !== true ) {
                //
                //     helper.update();
                //
                // }

                // signals.refreshSidebarObject3D.dispatch( object );

                if(showEditPoints){
                    if(isSelectedPoint(selection.object)){
                        let group_top = getParent(object);
                        let group_geometry = group_top.children[1].geometry;
                        let geometry_position = group_geometry.getAttribute("position");
                        let new_position = selection.object.position;
                        // console.log();
                        // console.log(geometry_position);
                        geometry_position.setXYZ(selection.object.userData.index, new_position.x, new_position.y, new_position.z);
                        // console.log(geometry_position)
                        //
                        // geometry_position.copyAt(selection.index,selection.object.position);
                        // console.log(geometry_position);



                        group_geometry.getAttribute("position").needsUpdate = true;
                        // group_geometry.attributes.position.needsUpdate = true;
                        // console.log(group_geometry);
                        // console.log(group_points);
                    }
                }

            }

            render();

        });
        transformControls.addEventListener('mouseDown', function () {

            const object = transformControls.object;

            objectPositionOnDown = object.position.clone();
            objectRotationOnDown = object.rotation.clone();
            objectScaleOnDown = object.scale.clone();

            controls.enabled = false;

        });
        transformControls.addEventListener('mouseUp', function () {

            const object = transformControls.object;

            if (object !== undefined) {

                switch (transformControls.getMode()) {

                    case 'translate':

                        if (!objectPositionOnDown.equals(object.position)) {

                            // editor.execute( new SetPositionCommand( editor, object, object.position, objectPositionOnDown ) );

                        }

                        break;

                    case 'rotate':

                        if (!objectRotationOnDown.equals(object.rotation)) {

                            // editor.execute( new SetRotationCommand( editor, object, object.rotation, objectRotationOnDown ) );

                        }

                        break;

                    case 'scale':

                        if (!objectScaleOnDown.equals(object.scale)) {

                            // editor.execute( new SetScaleCommand( editor, object, object.scale, objectScaleOnDown ) );

                        }

                        break;

                }

            }

            controls.enabled = true;

        });
        scene.add(transformControls);
    }

    function rayCasting() {


        editorSignals.intersectionsDetected.add((intersects) => {


            if (intersects.length > 0) {

                const new_selection = intersects[0];

                if (new_selection.object.userData.object !== undefined) {
                    // todo maybe
                    // helper
                    select(new_selection.object.userData.object);
                } else {
                    select(new_selection);
                }
            } else {
                select(null);
            }

        });


        editorSignals.selectionChanged.add(function (new_selection) {

            // selectionBox.visible = false;
            if (selection != null) {
                if (showEditPoints) {
                    getParent(selection.object).traverse(function (child) {
                        if (child instanceof THREE.Points) {
                            child.visible = false;
                        }
                    });
                }
                selection = null;
            }
            transformControls.detach();
            if (!(new_selection === null || new_selection === undefined) && new_selection.object !== scene && new_selection.object !== camera) {

                // box.setFromObject( object, true );

                // if ( box.isEmpty() === false ) {
                //
                //     selectionBox.visible = true;
                //
                // }

                selection = new_selection;


                if (showEditPoints) {
                    getParent(selection.object).traverse(function (child) {
                        if (child instanceof THREE.Points) {
                            child.visible = true;
                        }
                    });
                }
                if (isSelectedPoint(selection.object)) {
                    // console.log(selection.index)
                    // let points = selection.object.geometry.attributes.position.array;
                    // for (let i = 0; i < points.length; i += 3) {
                    //     console.log(points[i], points[i + 1], points[i + 2])
                    // }
                    // console.log(points)

                    // let v = selection.object.geometry.attributes.position.array.slice(selection.index * 3,selection.index * 3 + 3);
                    // let point = new THREE.Vector3(v[0], v[1], v[2]);
                    //
                    // let helper_object = new Points((new THREE.BufferGeometry()).setFromPoints([new THREE.Vector3(0, 0, 0)]));
                    // helper_object.position.copy(point);
                    // helper_object.visible=false;
                    // scene.add(helper_object);
                    // transformControls.attach(helper_object);

                    transformControls.attach(selection.object);

                } else {
                    transformControls.attach(getParent(selection.object));
                }
            }

            render();

        });


    }

    function getParent(object) {
        while (object.parent !== objectsGroup) {
            object = object.parent
        }
        return object
    }

    function getIntersects(point) {

        mouse.set((point.x * 2) - 1, -(point.y * 2) + 1);

        raycaster.setFromCamera(mouse, camera);

        const _objects = [];

        objectsGroup.traverseVisible(function (child) {
            _objects.push(child);
        });

        // console.log(_objects)
        //
        // console.log(objectsGroup.children[0])
        // console.log(objectsGroup.children[0].children[0])
        //
        // _objects.push(objectsGroup.children[0].children[0]);
        //
        // console.log(_objects)

        //
        // sceneHelpers.traverseVisible( function ( child ) {
        //
        //     if ( child.name === 'picker' ) _objects.push( child );
        //
        // } );
        // todo when onTransformShowEditPoints is true

        return raycaster.intersectObjects(_objects, false);

    }

    function handleClick() {

        if (onDownPosition.distanceTo(onUpPosition) === 0) {
            const intersects = getIntersects(onUpPosition);

            editorSignals.intersectionsDetected.dispatch(intersects);

            render();

        }

    }

    function select(new_selection) { //todo
        if (new_selection === selection) return;
        editorSignals.selectionChanged.dispatch(new_selection);
    }

    function deselect() {

        select(null);

    }

    function onMouseUp(event) {

        const array = getMousePosition(container, event.clientX, event.clientY);
        onUpPosition.fromArray(array);

        handleClick();

        document.removeEventListener('mouseup', onMouseUp);

    }

    function isSelectedPoint(object) {
        return object instanceof THREE.Points;
    }

    function onMouseDown(event) {
        event.preventDefault();
        if (event.target !== renderer.domElement) return;

        const array = getMousePosition(container, event.clientX, event.clientY);
        onDownPosition.fromArray(array);

        document.addEventListener('mouseup', onMouseUp);

    }

    function getMousePosition(dom, x, y) {

        const rect = dom.getBoundingClientRect();
        return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];

    }

}
