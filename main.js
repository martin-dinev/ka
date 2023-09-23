import * as THREE from 'three';
import {Points} from 'three';
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
    let editorSignals, selection, selectionType;
    let showEditPoints = true, showEditLines = false, showEditFaces = true, allowEditFaces = false;


    // const pointer = new THREE.Vector2();
    // const onUpPosition = new THREE.Vector2();
    // const onDownPosition = new THREE.Vector2();

    const objectsGroup = new THREE.Group();
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 20;
    raycaster.params.Line.threshold = 8;

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

        //
        //
        // const verticesOfCube = [
        //     -1,-1,-1,    1,-1,-1,    1, 1,-1,    -1, 1,-1,
        //     -1,-1, 1,    1,-1, 1,    1, 1, 1,    -1, 1, 1,
        // ];
        //
        // const indicesOfFaces = [
        //     2,1,0,    0,3,2,
        //     0,4,7,    7,3,0,
        //     0,1,5,    5,4,0,
        //     1,2,6,    6,5,1,
        //     2,3,7,    7,6,2,
        //     4,5,6,    6,7,4
        // ];

        // const geometry = new THREE.PolyhedronGeometry( verticesOfCube, indicesOfFaces, 180, 0 );
        // const material = new THREE.MeshNormalMaterial( { color: 0xff0000, wireframe: false } );
        // const mesh = new THREE.Mesh( geometry, material );
        // mesh.position.set(300,0,-300);
        // scene.add( mesh );


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

    function addCube(dim = 250) {
        let containerGroup = new THREE.Group();
        containerGroup.userData.groupClass = "container";

        let dimHalf = dim / 2;

        let vertices = new THREE.Group();
        vertices.userData.groupClass = "vertices";
        let verticesPositions = new Float32Array([
            -dimHalf, -dimHalf, -dimHalf,
            -dimHalf, -dimHalf, dimHalf,
            -dimHalf, dimHalf, -dimHalf,
            -dimHalf, dimHalf, dimHalf,
            dimHalf, -dimHalf, -dimHalf,
            dimHalf, -dimHalf, dimHalf,
            dimHalf, dimHalf, -dimHalf,
            dimHalf, dimHalf, dimHalf
        ]);
        for (let i = 0; i < verticesPositions.length; i += 3) {
            let pointObject = new Points();

            let point = new THREE.Vector3(verticesPositions[i], verticesPositions[i + 1], verticesPositions[i + 2]);

            pointObject.userData.index = i / 3;
            pointObject.userData.mathObject = point;
            pointObject.userData.linesStart = [];
            pointObject.userData.linesEnd = [];
            pointObject.userData.triangleRefers = [];

            vertices.add(pointObject);

            // pointObject.matrixWorldNeedsUpdate = true; // todo research this

            let bufferGeometry = (new THREE.BufferGeometry()).setFromPoints([new THREE.Vector3(0, 0, 0)]);
            pointObject.position.copy(point);
            pointObject.geometry = bufferGeometry;

            pointObject.material = new THREE.PointsMaterial({color: 0xff00ff, size: 15, sizeAttenuation: false});
        }
        vertices.visible = false;
        containerGroup.add(vertices);

        let edges = new THREE.Group();
        edges.userData.groupClass = "edges";
        let edgesIndices = new Uint16Array([
            0, 1, 0, 2, 0, 4, 1, 3, 1, 5, 2, 3, 2, 6, 4, 5, 4, 6, 3, 7, 5, 7, 6, 7
            // 0     1     2     3     4     5     6     7     8     9    10    11
        ]);
        for (let i = 0; i < edgesIndices.length; i += 2) {
            let lineObject = new THREE.Line();

            let index1 = edgesIndices[i], index2 = edgesIndices[i + 1];
            lineObject.userData.startPoint = vertices.children[index1];
            lineObject.userData.startPoint.userData.linesStart.push(lineObject);
            lineObject.userData.endPoint = vertices.children[index2];
            lineObject.userData.endPoint.userData.linesEnd.push(lineObject);
            lineObject.userData.faceRefers = [];
            lineObject.userData.triangleRefers = [];

            let point1 = lineObject.userData.startPoint.userData.mathObject;
            let point2 = lineObject.userData.endPoint.userData.mathObject;
            let line = new THREE.Line3(point1, point2);

            lineObject.userData.index = i / 2;
            lineObject.userData.mathObject = line;

            edges.add(lineObject);

            let startPoint = new THREE.Vector3();
            let endPoint = point2.clone().sub(point1);
            let lineGeometry = (new THREE.BufferGeometry()).setFromPoints([startPoint, endPoint]);
            lineObject.position.copy(point1);
            lineObject.geometry = lineGeometry;

            lineObject.material = new THREE.LineBasicMaterial({
                color: Math.random() * 0xffffff,
                linewidth: 2,
            });
        }
        edges.visible = false;
        containerGroup.add(edges);

        let faces = new THREE.Group();
        faces.userData.groupClass = "faces";
        let faceIndices = new Uint16Array([
            0, 3, 5, 1,
            0, 2, 7, 4,
            2, 1, 6, 8,
            3, 4, 10, 9,
            5, 9, 11, 6,
            7, 8, 11, 10
        ]);
        for (let i = 0; i < faceIndices.length; i += 4) {
            let faceObject = new THREE.Mesh();

            let index1 = faceIndices[i], index2 = faceIndices[i + 1], index3 = faceIndices[i + 2],
                index4 = faceIndices[i + 3];
            let edge1 = {par: faceObject, ref: edges.children[index1], prev: undefined, next: undefined, dir: true};
            let edge2 = {par: faceObject, ref: edges.children[index2], prev: undefined, next: undefined, dir: true};
            let edge3 = {par: faceObject, ref: edges.children[index3], prev: undefined, next: undefined, dir: true};
            let edge4 = {par: faceObject, ref: edges.children[index4], prev: undefined, next: undefined, dir: true};

            if ([edge2.ref.userData.startPoint, edge2.ref.userData.endPoint].includes(edge1.ref.userData.startPoint)) {
                edge1.dir = false;
            }
            if ([edge3.ref.userData.startPoint, edge3.ref.userData.endPoint].includes(edge2.ref.userData.startPoint)) {
                edge2.dir = false;
            }
            if ([edge4.ref.userData.startPoint, edge4.ref.userData.endPoint].includes(edge3.ref.userData.startPoint)) {
                edge3.dir = false;
            }
            if ([edge1.ref.userData.startPoint, edge1.ref.userData.endPoint].includes(edge4.ref.userData.startPoint)) {
                edge4.dir = false;
            }

            edge1.next = edge2;
            edge1.prev = edge4;
            edge2.next = edge3;
            edge2.prev = edge1;
            edge3.next = edge4;
            edge3.prev = edge2;
            edge4.next = edge1;
            edge4.prev = edge3;

            edge1.ref.userData.faceRefers.push(edge1);
            edge2.ref.userData.faceRefers.push(edge2);
            edge3.ref.userData.faceRefers.push(edge3);
            edge4.ref.userData.faceRefers.push(edge4);

            faceObject.userData.index = i / 4;
            faceObject.userData.mathObject = edge1;
            faceObject.userData.edgeCount = 4;
            faceObject.userData.triangleRefers = [];
            // faceObject.visible = false;

            faces.add(faceObject);

            faceObject.geometry = getFaceGeometry(faceObject);
            // if (i == 0)
            //     console.log(faceObject);

            faceObject.material = new THREE.MeshBasicMaterial({
                color: Math.random() * 0xffffff,
                // wireframe: true,
            });
        }
        containerGroup.add(faces);

        // let index = [
        //     0, 1, 2, 2, 1, 3,
        //     6, 5, 4, 5, 6, 7,
        //     4, 1, 0, 1, 4, 5,
        //     2, 3, 6, 7, 6, 3,
        //     0, 2, 4, 6, 4, 2,
        //     5, 3, 1, 3, 5, 7
        // ];
        //
        // let verticies = new THREE.Group();
        //
        // let cubeGeometry = new THREE.BufferGeometry();
        // cubeGeometry.setIndex(index);
        // cubeGeometry.setAttribute('position', new THREE.BufferAttribute(verticiesPositions, 3));
        //
        // cubeGeometry.translate(250, 250, 250);
        // containerGroup.add(new THREE.Mesh(cubeGeometry, new THREE.MeshBasicMaterial({
        //     color: Math.random() * 0xffffff,
        //     // wireframe: true,
        // })));

        //
        // let cubeGeometry = new THREE.BoxGeometry(250, 250, 250);
        // cubeGeometry.deleteAttribute('normal');
        // cubeGeometry.deleteAttribute('uv');
        // cubeGeometry = mergeVertices(cubeGeometry);
        //

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

        // let normlas = new Float32Array(cubeGeometry.attributes.position.array.length);
        //
        // for (let i = 0; i < cubeGeometry.attributes.position.array.length; i += 3) {
        //     let pA = new THREE.Vector3(cubeGeometry.attributes.position.array[i], cubeGeometry.attributes.position.array[i + 1], cubeGeometry.attributes.position.array[i + 2]);
        //     pA.normalize();
        //     normlas[i] = pA.x;
        //     normlas[i + 1] = pA.y;
        //     normlas[i + 2] = pA.z;
        // }
        //
        // cubeGeometry.setAttribute('normal', new THREE.BufferAttribute(normlas, 3));
        // // cubeGeometry.computeVertexNormals();
        // // cubeGeometry.normalizeNormals();
        //
        // // cubeGeometry.computeBoundingSphere();
        // console.log(cubeGeometry);
        //
        // let coordinates = cubeGeometry.getAttribute('position').array;
        // // console.log(cubeGeometry.getAttribute('position'));
        // for (let i = 0; i < coordinates.length; i += 3) {
        //     let point = new THREE.Vector3(coordinates[i], coordinates[i + 1], coordinates[i + 2]);
        //     let helper_object = new Points((new THREE.BufferGeometry()).setFromPoints([new THREE.Vector3(0, 0, 0)]),
        //         new THREE.PointsMaterial({
        //             color: 0xff00ff,
        //             size: 15,
        //             sizeAttenuation: false
        //         }));
        //     helper_object.userData.index = i / 3;
        //     helper_object.position.copy(point);
        //     helper_object.visible = false;
        //     verticies.add(helper_object);
        // }
        //
        // // verticies = new THREE.Points(cubeGeometry, new THREE.PointsMaterial({
        // //     color: 0xff00ff, size: 15, sizeAttenuation: false
        // // }));
        //
        // // console.log(verticies);
        //
        // let cubeMesh = new THREE.MeshNormalMaterial({color: Math.random() * 0xffffff, wireframe: false,});
        // // cubeGeometry = ;
        // let cube = new THREE.Mesh(cubeGeometry, cubeMesh);
        //
        // // verticies.visible = false;
        //
        // // containerGroup.add(verticies);
        // // containerGroup.add(cube);
        containerGroup.translateX(125);
        containerGroup.translateY(125);
        containerGroup.translateZ(125);
        objectsGroup.add(containerGroup);
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
            editLinesChanged: new Signal(),
            editFacesChanged: new Signal(),
            allowEditFacesChanged: new Signal(),

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

        editorSignals.editLinesChanged.add(function (newShowEditLines) {
            showEditLines = newShowEditLines;
            editorSignals.selectionChanged.dispatch(selection);
            render();
        });

        editorSignals.editFacesChanged.add(function (newShowEditFaces) {
            showEditFaces = newShowEditFaces;
            editorSignals.selectionChanged.dispatch(selection);
            render();
        });

        editorSignals.allowEditFacesChanged.add(function (newAllowEditFaces) {
            allowEditFaces = newAllowEditFaces;
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

                if (showEditPoints && isSelectedPoint(object)) {
                    console.log("moving point");
                    // // todo pull on linked elements


                    // let group_top = getParent(object);
                    // console.log("group top",group_top);
                    // let group_vertices = group_top.children[0];
                    // let geometry_position = group_geometry.getAttribute("position");
                    // let new_position = object.position;
                    // // console.log();
                    // // console.log(geometry_position);
                    // geometry_position.setXYZ(selection.object.userData.index, new_position.x, new_position.y, new_position.z);
                    // // console.log(geometry_position)
                    // //
                    // // geometry_position.copyAt(selection.index,selection.object.position);
                    // // console.log(geometry_position);
                    //
                    //
                    // group_geometry.getAttribute("position").needsUpdate = true; //todo what does this do
                    // // group_geometry.attributes.position.needsUpdate = true;
                    // // console.log(group_geometry);
                    // // console.log(group_points);
                } else if (showEditLines && isSelectedLine(object)) {
                    console.log("moving line");
                } else if (showEditFaces && allowEditFaces && isSelectedFace(object)) {
                    console.log("moving face");
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
                        if (!objectPositionOnDown.equals(object.position)) {/*editor.execute( new SetPositionCommand( editor, object, object.position, objectPositionOnDown ) );*/
                        }
                        break;
                    case 'rotate':
                        if (!objectRotationOnDown.equals(object.rotation)) {/*editor.execute( new SetRotationCommand( editor, object, object.rotation, objectRotationOnDown ) );*/
                        }
                        break;
                    case 'scale':
                        if (!objectScaleOnDown.equals(object.scale)) {/*editor.execute( new SetScaleCommand( editor, object, object.scale, objectScaleOnDown ) );*/
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
            console.log("intersects: ", intersects);
            if (intersects.length > 0) select(intersects[0]);
            else select(null);
        });


        editorSignals.selectionChanged.add(function (new_selection) {
            // console.log(selection, new_selection, showEditPoints, showEditLines, showEditFaces);
            // selectionBox.visible = false;
            if (selection != null) {
                getParent(selection.object).traverse(function (child) {
                    if (child.userData.groupClass === "vertices") {
                        child.visible = false;
                        console.log(child);
                    }
                    if (child.userData.groupClass === "edges") {
                        child.visible = false;
                    }
                    if (child.userData.groupClass === "faces") {
                        child.visible = true;
                    }
                });
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


                getParent(selection.object).traverse(function (child) {
                    if (showEditPoints && child.userData.groupClass === "vertices") {
                        child.visible = true;
                    }
                    if (showEditLines && child.userData.groupClass === "edges") {
                        child.visible = true;
                    }
                    if (!showEditFaces && child.userData.groupClass === "faces") {
                        child.visible = false;
                    }
                });
                if (showEditPoints && isSelectedPoint(selection.object)) {
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

                } else if(showEditLines && isSelectedLine(selection.object))
                {
                    transformControls.attach(selection.object);
                }else if(showEditFaces && allowEditFaces && isSelectedFace(selection.object)){
                    transformControls.attach(selection.object);
                }
                else{
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

        // console.log(_objects);
        // let intersectObjects = raycaster.intersectObjects(_objects, false);
        // console.log(intersectObjects);
        // return intersectObjects;

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

    function isSelectedLine(object){ // todo refactor these three with parent group class
        return object instanceof THREE.Line;
    }

    function isSelectedFace(object){
        return object instanceof THREE.Mesh;
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

    function getFaceGeometry(faceObject, offset = 0) {
        // console.log("NEW");

        let firstEdge = faceObject.userData.mathObject;
        // console.log(firstEdge)
        for (let i = 0; i < offset; i++) firstEdge = firstEdge.next;

        let edges = [firstEdge];
        while (edges[edges.length - 1].next !== firstEdge) edges.push(edges[edges.length - 1].next);

        let points = [];

        for (let edge of edges) {
            // console.log(edge.dir, edge.ref.userData.startPoint.userData.mathObject, edge.ref.userData.endPoint.userData.mathObject)
            if (edge.dir) points.push(edge.ref.userData.startPoint);
            else points.push(edge.ref.userData.endPoint);
        }

        // for (let i = 0; i < points.length; i++) {
        //     let v31 = points[i].userData.mathObject;
        //     let v32 = points[(i + 1) % points.length].userData.mathObject;
        //     console.log(v31, v32, v31.distanceTo(v32));
        // }

        const redundancy = 3;
        let geometry = new THREE.BufferGeometry();
        // console.log(3 * 3 * (faceObject.userData.edgeCount - 2) * redundancy);
        let emptyArray = new Float32Array(3 * 3 * (faceObject.userData.edgeCount - 2) * redundancy);
        // console.log(emptyArray);
        // console.log(emptyArray.length);
        // console.log(emptyArray[10] = 7);
        // console.log(emptyArray[10]);
        geometry.setAttribute('position', new THREE.BufferAttribute(emptyArray, 3));
        // let positionAttribute = geometry.getAttribute('position');
        let vertices = geometry.getAttribute('position').array;
        // console.log();
        let index = 0;
        faceObject.userData.triangleRefers.length = 0;
        for (let i = 0; i < points.length - 2; i++) {
            let topIndex = (i + 1) / 2 | 0;
            let bottomIndex = points.length - 1 - (i / 2 | 0);
            let triangle = {index: i, ref: faceObject, points: [], edges: []};
            faceObject.userData.triangleRefers.push(triangle);
            if (i === points.length - 3 && points.length % 2 === 0) {
                triangle.edges.push(edges[topIndex]);
            }
            if (i % 2 === 0) {
                triangle.points = [points[topIndex], points[topIndex + 1], points[bottomIndex]];
                triangle.edges.push(edges[topIndex]);
            } else {
                triangle.points = [points[topIndex], points[bottomIndex - 1], points[bottomIndex]];
                triangle.edges.push(edges[bottomIndex - 1]);
            }
            if (i === points.length - 3 && points.length % 2 === 1) {
                triangle.edges.push(edges[topIndex + 1]);
            }
            if (i === 0) triangle.edges.push(edges[bottomIndex]);

            for (let j = 0; j < triangle.edges.length; j++) {
                let edge = triangle.edges[j];
                edge.ref.userData.triangleRefers.push({index: j, ref: triangle});
            }

            for (let j = 0; j < triangle.points.length; j++) {
                let point = triangle.points[j];
                point.userData.triangleRefers.push({index: j, ref: triangle});
                // positionAttribute.
                // console.log("POINT",point,point.userData.mathObject,index);
                // console.log(vertices[index], point.userData.mathObject.x);
                // vertices[index] = point.userData.mathObject.x;
                // console.log(vertices[index], point.userData.mathObject.x);
                // index ++;
                vertices[index++] = point.userData.mathObject.x;
                vertices[index++] = point.userData.mathObject.y;
                vertices[index++] = point.userData.mathObject.z;
                // console.log(vertices[index - 3], vertices[index - 2], vertices[index - 1]);
            }
        }
        // console.log(vertices);
        geometry.getAttribute('position').needsUpdate = true; // todo I still don't know what this does or if I need it
        // set start and count in geometry
        geometry.setDrawRange(0, 3 * 3 * faceObject.userData.triangleRefers.length);

        geometry.computeVertexNormals();
        geometry.normalizeNormals();
        return geometry;
    }

}
