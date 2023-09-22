import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GUI} from "three/addons/libs/lil-gui.module.min";
import {TransformControls} from "three/addons/controls/TransformControls";
import {Toolbar} from "./Toolbar";

if (!WebGL.isWebGLAvailable()) {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
} else {

    let container, stats, gui;
    let camera, scene, renderer;
    let controls, transformControls;
    let editorSignals, selected, selectedShowPoints, onTransformShowEditPoints, isTheSelectedPoint;


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
        scene.background = new THREE.Color(0xf0f0f0);
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
        let cubeGeometry = new THREE.BoxGeometry(250, 250, 250);
        let cubeMesh = new THREE.MeshPhongMaterial({color: Math.random() * 0xffffff});
        let cube = new THREE.Mesh(cubeGeometry, cubeMesh);
        let group = new THREE.Group();

        //
        // let mergedVerticies = new THREE.BoxGeometry( 250, 250, 250);
        // mergedVerticies.deleteAttribute( 'normal' );
        // mergedVerticies.deleteAttribute( 'uv' );
        // mergedVerticies = mergeVertices( mergedVerticies );
        // let positionAttribute = mergedVerticies.getAttribute("position");
        //
        // const colors = [];
        // const sizes = [];
        //
        // const color = new THREE.Color();
        //
        // for ( let i = 0, l = positionAttribute.count; i < l; i ++ ) {
        //
        //     color.setHSL( 0.01 + 0.1 * ( i / l ), 1.0, 0.5 );
        //     color.toArray( colors, i * 3 );
        //
        //     sizes[ i ] = 100;
        //
        // }
        //
        //
        // let verticiesGeometry = new THREE.BufferGeometry();
        // verticiesGeometry.setAttribute( "position", positionAttribute);



        let verticies = new THREE.Points(cubeGeometry, new THREE.PointsMaterial({color: 0xff00ff, size: 15, sizeAttenuation: false}));
        verticies.visible = false;

        group.add(verticies);
        group.add(cube);
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
            editPointsChanged: new Signal(),
            // rendererCreated: new Signal(),
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

            objectSelected: new Signal(),
            // objectFocused: new Signal(),
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

        editorSignals.editPointsChanged.add(function (showEditPoints) {
            onTransformShowEditPoints = showEditPoints;
            if(selected != null){
                editorSignals.intersectionsDetected.dispatch(selected);
            }
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

                const object = intersects[0].object;

                if (object.userData.object !== undefined) {

                    // helper

                    select(object.userData.object);

                } else {

                    select(object);

                }

            } else {

                select(null);

            }

        });


        editorSignals.objectSelected.add(function (object) {

            // selectionBox.visible = false;
            if(selected != null){
                if(selectedShowPoints){
                    selected.traverse(function (child) {
                        if (child instanceof THREE.Points) {
                            child.visible = false;
                        }
                    });
                }
                selected = null;
            }
            transformControls.detach();

            if (object !== null && object !== scene && object !== camera) {

                // box.setFromObject( object, true );

                // if ( box.isEmpty() === false ) {
                //
                //     selectionBox.visible = true;
                //
                // }

                selected = getParent(object);


                if(onTransformShowEditPoints){
                    selectedShowPoints = true;
                    selected.traverse(function (child) {
                        if (child instanceof THREE.Points) {
                            child.visible = true;
                        }
                    });
                }else{
                    selectedShowPoints = false;
                }

                isTheSelectedPoint = isSelectedPoint(object);
                if (isTheSelectedPoint) {
                    transformControls.attach(object);
                }
else
                transformControls.attach(getParent(object));

            }

            render();

        });


    }

    function getParent(object){
        while(object.parent!==objectsGroup){
            object=object.parent
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

    function select(object) { //todo
        let objectParent = null
        if (object != null) objectParent = getParent(object);

        if (selected === objectParent && selectedShowPoints === onTransformShowEditPoints && isTheSelectedPoint === isSelectedPoint(object) ) return;

        let uuid = null;

        if (objectParent !== null) {

            uuid = objectParent.uuid;

        }

        // config.setKey( 'selected', uuid );

        editorSignals.objectSelected.dispatch(object);

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
