import * as THREE from 'three';
import {Points, Vector3} from 'three';
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
    let editorSignals, selection;
    let showEditPoints = true, showEditLines = false, showEditFaces = true, allowEditFaces = false;

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

        container.addEventListener('mousedown', onMouseDown);
        window.addEventListener('resize', onWindowResize);

        addCube();

        render();

    }


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
            pointObject.userData.position = new THREE.Vector3(0, 0, 0);
            pointObject.userData.locked = false;

            vertices.add(pointObject);

            // pointObject.matrixWorldNeedsUpdate = true; // todo research this

            let bufferGeometry = (new THREE.BufferGeometry()).setFromPoints([new THREE.Vector3(0, 0, 0)]);
            pointObject.position.copy(point);
            pointObject.userData.position.copy(pointObject.position);
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
            lineObject.userData.position = new THREE.Vector3(0, 0, 0);
            lineObject.userData.locked = false;
            edges.add(lineObject);

            let midPoint = new THREE.Vector3().addVectors(point1, point2).divideScalar(2);
            let startPoint = point1.clone().sub(midPoint);
            let endPoint = point2.clone().sub(midPoint);
            let lineGeometry = (new THREE.BufferGeometry()).setFromPoints([startPoint, endPoint]);
            lineObject.position.copy(midPoint);
            lineObject.userData.position.copy(lineObject.position);
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
            faceObject.userData.runningAveragePoints = new THREE.Vector3(0, 0, 0);
            faceObject.userData.runningAverageNormal = new THREE.Vector3(0, 0, 0);
            faceObject.userData.position = new THREE.Vector3(0, 0, 0);
            faceObject.userData.locked = false;

            faces.add(faceObject);

            getFaceGeometry(faceObject);

            faceObject.material = new THREE.MeshNormalMaterial({
                // color: Math.random() * 0xffffff,
                // wireframe: true,
            });
        }
        containerGroup.add(faces);
        // console.log(faces);


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
                function updateVertex(vertex, new_position) {
                    vertex.userData.position.copy(new_position);
                    vertex.position.copy(new_position);

                    vertex.userData.mathObject.copy(vertex.position);
                    for (let line of vertex.userData.linesStart.concat(vertex.userData.linesEnd)) {
                        if (line.userData.locked) continue;

                        let point1 = line.userData.mathObject.start;
                        let point2 = line.userData.mathObject.end;
                        let midPoint = new THREE.Vector3().addVectors(point1, point2).divideScalar(2);
                        let startPoint = point1.clone().sub(midPoint);
                        let endPoint = point2.clone().sub(midPoint);

                        line.position.copy(midPoint);
                        line.userData.position.copy(midPoint);
                        let linePosition = line.geometry.getAttribute("position");
                        linePosition.setXYZ(0, startPoint.x, startPoint.y, startPoint.z);
                        linePosition.setXYZ(1, endPoint.x, endPoint.y, endPoint.z);

                        linePosition.needsUpdate = true;
                    }

                    for (let triangleGroup of vertex.userData.triangleRefers) {
                        if (triangleGroup.triangle.face.userData.locked) continue;

                        let triangle = triangleGroup.triangle;
                        let triangleIndex = triangleGroup.index;
                        let point1 = triangle.points[0].userData.mathObject;
                        let point2 = triangle.points[1].userData.mathObject;
                        let point3 = triangle.points[2].userData.mathObject;

                        let point;
                        if (triangleIndex === 0) point = point1;
                        else if (triangleIndex === 1) point = point2;
                        else point = point3;

                        point = point.clone().sub(triangle.face.position);

                        let facePosition = triangle.face.geometry.getAttribute("position");
                        facePosition.setXYZ(triangleIndex + triangle.index * 3, point.x, point.y, point.z);
                        facePosition.needsUpdate = true;

                        let normal = triangle.normal;
                        triangle.face.userData.runningAverageNormal.sub(normal);
                        normal.subVectors(point3, point2).cross(new Vector3().subVectors(point1, point2));
                        triangle.face.userData.runningAverageNormal.add(normal);
                        let normalized = normal.clone().normalize();

                        let faceNormal = triangle.face.geometry.getAttribute("normal");
                        faceNormal.setXYZ(triangle.index * 3, normalized.x, normalized.y, normalized.z);
                        faceNormal.setXYZ(triangle.index * 3 + 1, normalized.x, normalized.y, normalized.z);
                        faceNormal.setXYZ(triangle.index * 3 + 2, normalized.x, normalized.y, normalized.z);
                        faceNormal.needsUpdate = true; // todo remove; ahahahahaha, now I learned what needsUpdate means
                    }
                }

                function updateEdge(edge, new_position) {
                    edge.position.copy(new_position);
                    edge.userData.locked = true;
                    let translation = edge.position.clone().sub(edge.userData.position);
                    updateVertex(edge.userData.startPoint, edge.userData.mathObject.start.clone().add(translation));
                    updateVertex(edge.userData.endPoint, edge.userData.mathObject.end.clone().add(translation));
                    edge.userData.locked = false;
                    edge.userData.position.copy(edge.position);
                    edge.matrixWorldAutoUpdate = true;
                }

                function updateFace(face, new_position) {
                    face.position.copy(new_position);
                    face.userData.locked = true;
                    let translation = object.position.clone().sub(object.userData.position);

                    let firstEdge = face.userData.mathObject;
                    let secondEdges = [firstEdge];
                    while (secondEdges[secondEdges.length - 1].next !== firstEdge && secondEdges[secondEdges.length - 1].next.next !== firstEdge) secondEdges.push(secondEdges[secondEdges.length - 1].next.next);

                    for (let edge of secondEdges) {
                        updateEdge(edge.ref, edge.ref.position.clone().add(translation));
                    }

                    if (face.userData.edgeCount % 2 !== 0) {
                        let edge = secondEdges[secondEdges.length - 1].next;
                        let vertex = edge.dir ? edge.ref.userData.startPoint : edge.ref.userData.endPoint;
                        updateVertex(vertex, vertex.position.clone().add(translation));
                    }

                    face.userData.locked = false;
                    face.userData.position.copy(face.position);
                }

                if (showEditPoints && isSelectedPoint(object)) {
                    console.log("moving point", object);
                    updateVertex(object, object.position);
                } else if (showEditLines && isSelectedLine(object)) {
                    console.log("moving line", object);
                    updateEdge(object, object.position);
                    // let position = object.userData.position;
                    // let startPoint = object.userData.startPoint;
                    // let endPoint = object.userData.endPoint;
                    // startPoint.userData.position.copy(object.position).sub(position).add(startPoint.userData.mathObject);
                    // endPoint.userData.position.copy(object.position).sub(position).add(endPoint.userData.mathObject);
                    // updateVertex(startPoint, startPoint.userData.position);
                    // updateVertex(endPoint, endPoint.userData.position);
                } else if (showEditFaces && allowEditFaces && isSelectedFace(object)) {
                    console.log("moving face");
                    updateFace(object, object.position);
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
                    transformControls.attach(selection.object);
                } else if (showEditLines && isSelectedLine(selection.object)) {
                    transformControls.attach(selection.object);
                } else if (showEditFaces && allowEditFaces && isSelectedFace(selection.object)) {
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
            if (!(child instanceof THREE.Group))
                _objects.push(child);
        });

        return raycaster.intersectObjects(_objects, true); //todo this has bugs or I am not using it right

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

    function isSelectedLine(object) { // todo refactor these three with parent group class
        return object instanceof THREE.Line;
    }

    function isSelectedFace(object) {
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
        // console.log(dom);
        const rect = dom.getBoundingClientRect();
        return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];

    }

    function getFaceGeometry(faceObject, offset = 0) {
        let triangleCount = faceObject.userData.edgeCount - 2;

        let firstEdge = faceObject.userData.mathObject;
        for (let i = 0; i < offset; i++) firstEdge = firstEdge.next;

        let edges = [firstEdge];
        while (edges[edges.length - 1].next !== firstEdge) edges.push(edges[edges.length - 1].next);

        let points = [];
        for (let edge of edges) {
            if (edge.dir) points.push(edge.ref.userData.startPoint);
            else points.push(edge.ref.userData.endPoint);
        }

        faceObject.userData.runningAveragePoints.set(0, 0, 0);
        for (let point of points) {
            faceObject.userData.runningAveragePoints.add(point.userData.mathObject);
        }
        faceObject.position.copy(faceObject.userData.runningAveragePoints.clone().divideScalar(points.length));
        faceObject.userData.position.copy(faceObject.position);

        let geometry = faceObject.geometry;
        if (geometry === undefined) {
            geometry = new THREE.BufferGeometry();
            faceObject.geometry = geometry;
        }
        geometry.setDrawRange(0, 3 * 3 * triangleCount);

        const redundancy = 3;
        let arraySize = 3 * 3 * triangleCount * redundancy;


        let positionAttribute = geometry.getAttribute('position');
        if (positionAttribute === undefined || positionAttribute.array.length < arraySize) {
            if (positionAttribute !== undefined) positionAttribute.dispose();
            positionAttribute = new THREE.BufferAttribute(new Float32Array(arraySize), 3);
            geometry.setAttribute('position', positionAttribute);
        }

        const cb = new Vector3(), ab = new Vector3();
        faceObject.userData.triangleRefers.length = 0; // todo undo references
        for (let i = 0; i < triangleCount; i++) {
            let topIndex = (i + 1) / 2 | 0;
            let bottomIndex = points.length - 1 - (i / 2 | 0);
            let triangle = {index: i, face: faceObject, points: [], edges: [], normal: new Vector3()};
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
                edge.ref.userData.triangleRefers.push({index: j, triangle: triangle});
            }

            for (let j = 0; j < triangle.points.length; j++) {
                let point = triangle.points[j];
                point.userData.triangleRefers.push({index: j, triangle: triangle});
                let pointPosition = point.userData.mathObject.clone().sub(faceObject.position);
                positionAttribute.setXYZ(i * 3 + j, pointPosition.x, pointPosition.y, pointPosition.z);
            }
            let pA = triangle.points[0].userData.mathObject;
            let pB = triangle.points[1].userData.mathObject;
            let pC = triangle.points[2].userData.mathObject;
            cb.subVectors(pC, pB);
            ab.subVectors(pA, pB);
            cb.cross(ab);
            triangle.normal.copy(cb);
        }
        positionAttribute.needsUpdate = true;

        // geometry.computeVertexNormals();

        let normalAttribute = geometry.getAttribute('normal');
        if (normalAttribute === undefined || normalAttribute.array.length < arraySize) {
            if (normalAttribute !== undefined) normalAttribute.dispose();
            normalAttribute = new THREE.BufferAttribute(new Float32Array(arraySize), 3);
            geometry.setAttribute('normal', normalAttribute);
        }

        faceObject.userData.runningAverageNormal.set(0, 0, 0);

        for (let i = 0; i < triangleCount; i++) {
            let triangle = faceObject.userData.triangleRefers[i];
            let normal = triangle.normal;
            faceObject.userData.runningAverageNormal.add(normal);
            normalAttribute.setXYZ(i * 3 + 0, normal.x, normal.y, normal.z);
            normalAttribute.setXYZ(i * 3 + 1, normal.x, normal.y, normal.z);
            normalAttribute.setXYZ(i * 3 + 2, normal.x, normal.y, normal.z);
        }

        const globalNormal = false; // todo se zafrknav :( trebashe da e true, ama updates kje se poteshki taka
        if (globalNormal)
            for (let i = 0; i < triangleCount * 3; i++) {
                normalAttribute.setXYZ(i, faceObject.userData.runningAverageNormal.x, faceObject.userData.runningAverageNormal.y, faceObject.userData.runningAverageNormal.z);
            }

        normalAttribute.needsUpdate = true;
        geometry.normalizeNormals();
    }

}
