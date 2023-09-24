import * as THREE from 'three';
import {Points, Vector3} from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GUI} from "three/addons/libs/lil-gui.module.min";
import {TransformControls} from "three/addons/controls/TransformControls";
import {Toolbar} from "./Toolbar";

let container, stats, gui;
let camera, scene, renderer;
let controls, transformControls;
let editorSignals, selection = undefined;
let showEditPoints = true, showEditLines = true, showEditFaces = true, allowEditFaces = false;

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
    subdivide: () => subdivide(selection ? selection.object : undefined),
    export: () => {
        console.log("wait");
    },
};

let objectPositionOnDown = null;
let objectRotationOnDown = null;
let objectScaleOnDown = null;

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

function addRef(first, second, firstName, secondName, firstStart, secondPos) {
    console.assert(second.userData[secondName] === undefined, "Can't add a reference if it already exists, remove the old one first", firstName, first, secondName, second, secondPos);
    let ref = {prev: undefined, next: undefined};
    ref[firstName] = first;
    ref[secondName] = second;
    if (first.userData[firstStart] === undefined) first.userData[firstStart] = ref;
    else {
        ref.next = first.userData[firstStart];
        first.userData[firstStart].prev = ref;
        first.userData[firstStart] = ref;
    }
    second.userData[secondPos] = ref;
}

function removeRef(reference, firstName, secondName, firstStart, secondPos) {
    let first = reference[firstName];
    let second = reference[secondName];
    if (reference.prev === undefined) first.userData[firstStart] = reference.next;
    else reference.prev.next = reference.next;
    if (reference.next !== undefined) reference.next.prev = reference.prev;
    second.userData[secondPos] = undefined;
}

function addDoubleRef(first, second, firstName, secondName, firstStart, secondStart) { //todo maybe refactor firstStart the same way as prev and next
    let ref = {};
    let firstPrev = firstName + "Prev";
    ref[firstPrev] = undefined;
    let firstNext = firstName + "Next";
    ref[firstNext] = undefined;
    let secondPrev = secondName + "Prev";
    ref[secondPrev] = undefined;
    let secondNext = secondName + "Next";
    ref[secondNext] = undefined;
    ref[firstName] = first;
    ref[secondName] = second;
    if (first.userData[firstStart] === undefined) first.userData[firstStart] = ref;
    else {
        ref[firstNext] = first.userData[firstStart];
        first.userData[firstStart][firstPrev] = ref;
        first.userData[firstStart] = ref;
    }
    if (second.userData[secondStart] === undefined) second.userData[secondStart] = ref;
    else {
        ref[secondNext] = second.userData[secondStart];
        second.userData[secondStart][secondPrev] = ref;
        second.userData[secondStart] = ref;
    }
}

/*

function addVertexLineStartRef(vertex, line) {
    console.assert(line.lineStart!==undefined, "line.linesStart is not undefined before assigning", vertex, line);

    let lineRef = {vertex: vertex, line: line, prev: undefined, next: undefined};
    if (vertex.userData.linesStartRef === undefined) vertex.userData.linesStartRef = lineRef;
    else {
        lineRef.next = vertex.userData.linesStartRef;
        vertex.userData.linesStartRef.prev = lineRef;
        vertex.userData.linesStartRef = lineRef;
    }
    line.userData.lineStart = lineRef;
}

function removeVertexLineStartRef(lineRef) {
    let vertex = lineRef.vertex;
    if (lineRef.prev === undefined) vertex.userData.linesStartRef = lineRef.next;
    else lineRef.prev.next = lineRef.next;
    if (lineRef.next !== undefined) lineRef.next.prev = lineRef.prev;
    let line = lineRef.line;
    line.userData.lineStart = undefined;
}

function addVertexLineEndRef(vertex, line) {
    let lineRef = {vertex: vertex, line: line, prev: undefined, next: undefined};
    if (vertex.userData.linesEnd === undefined) vertex.userData.linesEnd = lineRef;
    else {
        lineRef.next = vertex.userData.linesEnd;
        vertex.userData.linesEnd.prev = lineRef;
        vertex.userData.linesEnd = lineRef;
    }
}

function removeVertexLineEndRef(lineRef) {
    let vertex = lineRef.vertex;
    if (lineRef.prev === undefined) vertex.userData.linesEndRef = lineRef.next;
    else lineRef.prev.next = lineRef.next;
    if (lineRef.next !== undefined) lineRef.next.prev = lineRef.prev;
}

function addVertexTriangleRef(vertex, triangle) {
    let triangleRef = {vertex: vertex, triangle: triangle, prev: undefined, next: undefined};
    if (vertex.userData.triangleRefers === undefined) vertex.userData.triangleRefers = triangleRef;
    else {
        triangleRef.next = vertex.userData.triangleRefers;
        vertex.userData.triangleRefers.prev = triangleRef;
        vertex.userData.triangleRefers = triangleRef;
    }
}

function removeVertexTriangleRef(triangleRef) {
    let vertex = triangleRef.vertex;
    if (triangleRef.prev === undefined) vertex.userData.triangleRefers = triangleRef.next;
    else triangleRef.prev.next = triangleRef.next;
    if (triangleRef.next !== undefined) triangleRef.next.prev = triangleRef.prev;
}
*/

function getNewVertex(verticesPosition1, verticesPosition2, verticesPosition3) {
    let pointObject = new Points();
    let point = new THREE.Vector3(verticesPosition1, verticesPosition2, verticesPosition3);

    pointObject.userData.mathObject = point;
    pointObject.userData.edgeStartRefers = undefined;
    pointObject.userData.edgeEndRefers = undefined;
    pointObject.userData.triangleRefers = undefined;
    pointObject.userData.position = point.clone();
    pointObject.userData.locked = false;
    pointObject.userData.locker = undefined;

    pointObject.position.copy(pointObject.userData.position);

    pointObject.geometry = (new THREE.BufferGeometry()).setFromPoints([new THREE.Vector3(0, 0, 0)]);

    pointObject.material = new THREE.PointsMaterial({color: 0xff00ff, size: 15, sizeAttenuation: false});
    return pointObject;
}

function getNewEdge(vertex1, vertex2) {
    let edgeObject = new THREE.Line();

    edgeObject.userData.edgeStart = undefined;
    addRef(vertex1, edgeObject, "vertex", "edge", "edgeStartRefers", "edgeStart");
    edgeObject.userData.edgeEnd = undefined;
    addRef(vertex2, edgeObject, "vertex", "edge", "edgeEndRefers", "edgeEnd");

    edgeObject.userData.faceRefers = undefined;

    let point1 = edgeObject.userData.edgeStart.vertex.userData.mathObject;
    let point2 = edgeObject.userData.edgeEnd.vertex.userData.mathObject;
    let line = new THREE.Line3(point1, point2);

    edgeObject.userData.mathObject = line;
    edgeObject.userData.position = new THREE.Vector3().addVectors(point1, point2).divideScalar(2);
    edgeObject.userData.locked = false;
    edgeObject.userData.locker = undefined;

    edgeObject.position.copy(edgeObject.userData.position);

    let midPoint = edgeObject.userData.position;
    let geometryStartPoint = point1.clone().sub(midPoint);
    let geometryEndPoint = point2.clone().sub(midPoint);
    edgeObject.geometry = (new THREE.BufferGeometry()).setFromPoints([geometryStartPoint, geometryEndPoint]);

    edgeObject.material = new THREE.LineBasicMaterial({
        color: Math.random() * 0xffffff,
        linewidth: 2,
    });

    return edgeObject;
}

function getNewFace(edgeList) {
    let faceObject = new THREE.Mesh();
    let edgeCount = edgeList.length;

    faceObject.userData.edges = undefined;
    for (let i = edgeList.length - 1; i >= 0; i--) {
        addRef(edgeList[i], faceObject, "edge", "face", "faceRefers", "edges");
    }

    faceObject.userData.edgeCount = edgeCount;
    // faceObject.userData.pointsSum = new THREE.Vector3(0, 0, 0);
    // faceObject.userData.normalsSum = new THREE.Vector3(0, 0, 0);
    // faceObject.userData.position = new THREE.Vector3(0, 0, 0);
    // for(let edge of edgeList){
    //     faceObject.userData.pointsSum.add(edge.position);
    // }


    faceObject.userData.locked = false;
    faceObject.userData.locker = undefined;


    // getFaceGeometry(faceObject);

    faceObject.material = new THREE.MeshNormalMaterial({
        // color: Math.random() * 0xffffff,
        // wireframe: true,
    });

    return faceObject;
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
        addToContainer(vertices, getNewVertex(verticesPositions[i], verticesPositions[i + 1], verticesPositions[i + 2]));
    }
    containerGroup.add(vertices);

    let edges = new THREE.Group();
    edges.userData.groupClass = "edges";
    let edgesIndices = new Uint16Array([
        0, 1, 0, 2, 0, 4, 1, 3, 1, 5, 2, 3, 2, 6, 4, 5, 4, 6, 3, 7, 5, 7, 6, 7
        // 0     1     2     3     4     5     6     7     8     9    10    11
    ]);
    for (let i = 0; i < edgesIndices.length; i += 2) {
        let index1 = edgesIndices[i], index2 = edgesIndices[i + 1];
        let vertex1 = vertices.children[index1];
        let vertex2 = vertices.children[index2];

        addToContainer(edges, getNewEdge(vertex1, vertex2));
    }
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

        let index1 = faceIndices[i], index2 = faceIndices[i + 1], index3 = faceIndices[i + 2],
            index4 = faceIndices[i + 3];
        let edge1 = edges.children[index1];
        let edge2 = edges.children[index2];
        let edge3 = edges.children[index3];
        let edge4 = edges.children[index4];
        let edgeList = [edge1, edge2, edge3, edge4];

        addToContainer(faces, getNewFace(edgeList));
    }
    containerGroup.add(faces);
    // console.log(faces);

    vertices.visible = true;
    edges.visible = true;

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
    gui.add(params, 'subdivide');
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

function addTransformControls() {
    transformControls.addEventListener('change', function () {
        const object = transformControls.object;
        if (object !== undefined) {
            if (showEditPoints && isSelectedPoint(object)) {
                /*console.log("moving point", object);*/
                updateVertex(object, object.position);
            } else if (showEditLines && isSelectedLine(object)) {
                /*console.log("moving line", object);*/
                updateEdge(object, object.position);
            } else if (showEditFaces && allowEditFaces && isSelectedFace(object)) {
                /*console.log("moving face");*/
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
        if (selection !== undefined && false) { // todo remove this && false
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
            selection = undefined;
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
    select(undefined);
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
        if (edge.dir) points.push(edge.edge.userData.startPoint);
        else points.push(edge.edge.userData.endPoint);
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
            edge.edge.userData.triangleRefers.push({index: j, triangle: triangle});
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

function updateVertex(vertex, new_position) {
    vertex.userData.position.copy(new_position);
    vertex.position.copy(new_position);
    vertex.userData.mathObject.copy(vertex.position);

    for (let refSource of ["edgeStartRefers", "edgeEndRefers"]) {
        for (let ref = vertex.userData[refSource]; ref !== undefined; ref = ref.next) {
            let edge = ref.edge;
            if (edge.userData.locked) continue;

            let point1 = edge.userData.mathObject.start;
            let point2 = edge.userData.mathObject.end;
            let midPoint = new THREE.Vector3().addVectors(point1, point2).divideScalar(2);
            let startPoint = point1.clone().sub(midPoint);
            let endPoint = point2.clone().sub(midPoint);

            edge.position.copy(midPoint);
            edge.userData.position.copy(midPoint);

            let linePosition = edge.geometry.getAttribute("position");
            linePosition.setXYZ(0, startPoint.x, startPoint.y, startPoint.z);
            linePosition.setXYZ(1, endPoint.x, endPoint.y, endPoint.z);

            linePosition.needsUpdate = true;
        }
    }


    for (let ref = vertex.userData.triangleRefers; ref !== undefined; ref = ref.next) {
        if (ref.triangle.face.userData.locked) continue;

        //
        // let triangleIndex = triangleGroup.index;
        // let point1 = triangle.points[0].userData.mathObject;
        // let point2 = triangle.points[1].userData.mathObject;
        // let point3 = triangle.points[2].userData.mathObject;
        //
        // let point;
        // if (triangleIndex === 0) point = point1;
        // else if (triangleIndex === 1) point = point2;
        // else point = point3;
        //
        // point = point.clone().sub(triangle.face.position);
        //
        // let facePosition = triangle.face.geometry.getAttribute("position");
        // facePosition.setXYZ(triangleIndex + triangle.index * 3, point.x, point.y, point.z);
        // facePosition.needsUpdate = true;
        //
        // let normal = triangle.normal;
        // triangle.face.userData.runningAverageNormal.sub(normal);
        // normal.subVectors(point3, point2).cross(new Vector3().subVectors(point1, point2));
        // triangle.face.userData.runningAverageNormal.add(normal);
        // let normalized = normal.clone().normalize();
        //
        // let faceNormal = triangle.face.geometry.getAttribute("normal");
        // faceNormal.setXYZ(triangle.index * 3, normalized.x, normalized.y, normalized.z);
        // faceNormal.setXYZ(triangle.index * 3 + 1, normalized.x, normalized.y, normalized.z);
        // faceNormal.setXYZ(triangle.index * 3 + 2, normalized.x, normalized.y, normalized.z);
        // faceNormal.needsUpdate = true; // todo remove comment; ahahahahaha, now I learned what needsUpdate means
    }
}

function updateEdge(edge, new_position) {
    edge.position.copy(new_position);
    edge.userData.locked = true;
    let translation = edge.position.clone().sub(edge.userData.position);
    let edgeStart = edge.userData.edgeStart.vertex;
    updateVertex(edgeStart, edgeStart.position.add(translation));
    let edgeEnd = edge.userData.edgeEnd.vertex;
    updateVertex(edgeEnd, edgeEnd.position.add(translation));
    edge.userData.locked = false;
    edge.userData.position.copy(edge.position);
}

function updateFace(face, new_position) {
    face.position.copy(new_position);
    face.userData.locked = true;
    let translation = face.position.clone().sub(face.userData.position);

    let firstEdge = face.userData.mathObject;
    let secondEdges = [firstEdge];
    while (secondEdges[secondEdges.length - 1].next !== firstEdge && secondEdges[secondEdges.length - 1].next.next !== firstEdge) secondEdges.push(secondEdges[secondEdges.length - 1].next.next);

    for (let edge of secondEdges) {
        updateEdge(edge.edge, edge.edge.position.clone().add(translation));
    }

    if (face.userData.edgeCount % 2 !== 0) {
        let edge = secondEdges[secondEdges.length - 1].next;
        let vertex = edge.dir ? edge.edge.userData.startPoint : edge.edge.userData.endPoint;
        updateVertex(vertex, vertex.position.clone().add(translation));
    }

    face.userData.locked = false;
    face.userData.position.copy(face.position);
}

function removeEdge(container, edge) {
    if(selection !== undefined && selection.object === edge) deselect();
    container.remove(edge);
    removeRef(edge.userData.edgeStart, "vertex", "edge", "edgeStartRefers", "edgeStart");
    removeRef(edge.userData.edgeEnd, "vertex", "edge", "edgeEndRefers", "edgeEnd");
    // container.children[index] = container.children[container.length - 1];
    // container.children[index].index = index;
    // container.children.pop();
}

function addToContainer(container, element) {
    // element.index = container.length;
    container.add(element);
}

function subdivide(object) {
    if (object === null || object === undefined) return;
    let parent = getParent(object);
    let vertices = parent.children[0];
    let edges = parent.children[1];
    let faces = parent.children[2];
    console.log(vertices, edges, faces);
    if (isSelectedFace(object)) {
        if (!allowEditFaces || !showEditFaces) return;
    }
    if (isSelectedLine(object)) {
        if (!showEditLines) return;
        let old_edge = object;
        let edgeMiddle = old_edge.position;
        let edgeStart = old_edge.userData.edgeStart.vertex;
        let edgeEnd = old_edge.userData.edgeEnd.vertex;
        let new_vertex = getNewVertex(edgeMiddle.x, edgeMiddle.y, edgeMiddle.z);
        addToContainer(vertices, new_vertex);
        let edge1 = getNewEdge(edgeStart, new_vertex);
        let edge2 = getNewEdge(new_vertex, edgeEnd);
        addToContainer(edges, edge1);
        addToContainer(edges, edge2);
        removeEdge(edges, old_edge);



        // let old_edge = object;
        // let edgeMiddle = old_edge.position;
        // let new_vertex = getNewVertex(edgeMiddle.x, edgeMiddle.y, edgeMiddle.z, vertices.children.length);
        // let edge1 = getNewEdge(old_edge.userData.startPoint, new_vertex, old_edge.index);
        // let edge2 = getNewEdge(new_vertex, old_edge.userData.endPoint, edges.length);
        //
        // let faces = [];
        //
        // for(let faceRefer of old_edge.userData.faceRefers){
        //     faces.push({index:faceRefer.index, edges: []});
        //     let edgeRefer = faceRefer.face.userData.mathObject;
        //     for(let i = 0 ; i < faceRefer.index ; i ++){
        //         edgeRefer = edgeRefer.next;
        //     }
        //     for(let edgeRefer2 = edgeRefer.next ; edgeRefer2 !== edgeRefer ; edgeRefer2 = edgeRefer2.next){
        //         faces[faces.length - 1].edges.push(edgeRefer2);
        //     }
        // }
        //
    }
    render();
    console.log("what are you subdividing: ", object);
}


if (!WebGL.isWebGLAvailable()) {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
} else {
    init();
}
