import * as THREE from 'three';
import {Points} from 'three';
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


function removeObject(object) {
    if (object === undefined) return;
    if (selection !== undefined && object === selection.object) select({object: getParent(object)});
    if (isObjectLine(object)) removeEdge(object);
    else if (isObjectPoint(object)) removeVertex(object);
    else if (isObjectFace(object)) removeFace(object);
    else console.error("object is not a point, line or face", object);
    render();
}

const params = {
    number: 10,
    addCube: addCube,
    subdivide: () => subdivide(selection ? selection.object : undefined),
    removeObject: () => removeObject(selection ? selection.object : undefined),
    export: () => {
        console.log("wait");
    },
    selectFace: () => {
        // select the first face to which a line is connected
        if (!selection) return;
        if (isObjectLine(selection.object)) select({object:selection.object.userData.faceRefers.face});
    }
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

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
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

function removeDoubleRef(reference, firstName, secondName, firstStart, secondStart) {
    let first = reference[firstName];
    let second = reference[secondName];
    if (reference[firstName + "Prev"] === undefined) first.userData[firstStart] = reference[firstName + "Next"];
    else reference[firstName + "Prev"][firstName + "Next"] = reference[firstName + "Next"];
    if (reference[firstName + "Next"] !== undefined) reference[firstName + "Next"][firstName + "Prev"] = reference[firstName + "Prev"];
    if (reference[secondName + "Prev"] === undefined) second.userData[secondStart] = reference[secondName + "Next"];
    else reference[secondName + "Prev"][secondName + "Next"] = reference[secondName + "Next"];
    if (reference[secondName + "Next"] !== undefined) reference[secondName + "Next"][secondName + "Prev"] = reference[secondName + "Prev"];
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
    pointObject.userData.faceVertexRefers = {}; // todo me is sad about this; remove comment
    pointObject.userData.triangleRefers = [];
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
    edgeObject.userData.triangleRefers = [];
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
    faceObject.userData.position = new THREE.Vector3();
    for (let i = edgeList.length - 1; i >= 0; i--) {
        addDoubleRef(edgeList[i], faceObject, "edge", "face", "faceRefers", "edges"); // todo remove comment, I've been debuging the wrong call....
        faceObject.userData.position.add(edgeList[i].userData.position);
    }
    faceObject.userData.position.divideScalar(edgeCount);
    faceObject.position.copy(faceObject.userData.position);

    faceObject.userData.edgeCount = edgeCount;
    faceObject.userData.triangleRefers = [];

    faceObject.userData.locked = false;
    faceObject.userData.locker = undefined;


    calculateFaceGeometry(faceObject);

    faceObject.material = new THREE.MeshNormalMaterial({
        // color: Math.random() * 0xffffff,
        // wireframe: true,
    });

    return faceObject;
}

function addCube(dim = 250) {
    let containerGroup = new THREE.Group();
    containerGroup.name = "customObject";

    let dimHalf = dim / 2;

    let vertices = new THREE.Group();
    vertices.name = "vertices";
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
    edges.name = "edges";
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
    faces.name = "faces";
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

        edgeList = [edge1, edge2, edge3, edge4];

        addToContainer(faces, getNewFace(edgeList));
    }
    containerGroup.add(faces);

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
    gui.add(params, 'removeObject').name("remove selection");
    gui.add(params, 'export');
    gui.add(params, 'selectFace').name("select face (bcs raycaster is bugged)");
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
            if (showEditPoints && isObjectPoint(object)) {
                /*console.log("moving point", object);*/
                updateVertex(object, object.position);
            } else if (showEditLines && isObjectLine(object)) {
                /*console.log("moving line", object);*/
                updateEdge(object, object.position);
            } else if (showEditFaces && allowEditFaces && isObjectFace(object)) {
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
        if (selection !== undefined) {
            getParent(selection.object).traverse(function (child) {
                if (child.name === "vertices" && false) {// todo remove this false
                    child.visible = false;
                }
                if (child.name === "edges" && false) {// todo and this false
                    child.visible = false;
                }
                if (child.name === "faces") {
                    child.visible = true;
                }
            });
            selection = undefined;
        }
        transformControls.detach();
        if (!(new_selection === null || new_selection === undefined) && new_selection.object !== scene && new_selection.object !== camera) {

            selection = new_selection;

            getParent(selection.object).traverse(function (child) {
                if (showEditPoints && child.name === "vertices") {
                    child.visible = true;
                }
                if (showEditLines && child.name === "edges") {
                    child.visible = true;
                }
                if (!showEditFaces && child.name === "faces") {
                    child.visible = false;
                }
            });
            if (showEditPoints && isObjectPoint(selection.object)) {
                transformControls.attach(selection.object);
            } else if (showEditLines && isObjectLine(selection.object)) {
                transformControls.attach(selection.object);
            } else if (showEditFaces && allowEditFaces && isObjectFace(selection.object)) {
                transformControls.attach(selection.object);
            } else {
                transformControls.attach(getParent(selection.object));
            }
        }
        render();
    });
}


function getIntersects(point) {
    mouse.set((point.x * 2) - 1, -(point.y * 2) + 1);
    raycaster.setFromCamera(mouse, camera);
    const _objects = [];

    objectsGroup.traverseVisible(function (child) {
        if (!(child instanceof THREE.Group))
            _objects.push(child);
    });
    // console.log(_objects);
    // if(_objects.length)
    //     console.log(raycaster.intersectObject(_objects[_objects.length-1]));
    // todo debug why Mesh isn't intersected by the raycaster

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


function getParent(object) {
    while (object.name !== "customObject") object = object.parent;
    return object;
}

function isObjectPoint(object) {
    return object instanceof THREE.Points;
}

function isObjectLine(object) { // todo refactor these three with parent group class
    return object instanceof THREE.Line;
}

function isObjectFace(object) {
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


function addFaceVertex(face, vertex) {
    let geometry = face.geometry;
    let positionAttribute = geometry.getAttribute("position");
    let normalAttribute = geometry.getAttribute("normal");

    let tr_vertex = vertex.userData.position.clone().sub(face.userData.position)
    let ind = positionAttribute.freeIndex++;
    normalAttribute.freeIndex++;

    if (ind === 0) normalAttribute.setXYZ(ind, 0, 0, 0);
    else normalAttribute.setXYZ(ind, normalAttribute.getX(0), normalAttribute.getY(0), normalAttribute.getZ(0));

    positionAttribute.setXYZ(ind, tr_vertex.x, tr_vertex.y, tr_vertex.z);

    let inversePositionAttribute = face.userData.inversePosition;
    inversePositionAttribute[ind] = {
        face: face,
        ind: ind,
        vertex: vertex,
    };
    vertex.userData.faceVertexRefers[face.uuid] = inversePositionAttribute[ind];
}

function updateFaceNormal(face) {
    let geometry = face.geometry;
    let indexAttribute = geometry.index;
    let inverseIndexAttribute = face.userData.inverseIndex;

    let normal = new THREE.Vector3();
    for (let i = 0; i < indexAttribute.freeIndex; i++) {
        let triangle = inverseIndexAttribute[i];
        normal.add(triangle.normal);
    }
    normal.normalize();

    let normalAttribute = geometry.getAttribute("normal");
    for (let i = 0; i < normalAttribute.freeIndex; i++) {
        normalAttribute.setXYZ(i, normal.x, normal.y, normal.z);
    }
    normalAttribute.needsUpdate = true;
}

function updateTriangleNormal(triangle, face) {
    let geometry = face.geometry;
    let positionAttribute = geometry.getAttribute("position");
    let indexAttribute = geometry.index;
    let index1 = indexAttribute.getX(triangle.ind);
    let index2 = indexAttribute.getY(triangle.ind);
    let index3 = indexAttribute.getZ(triangle.ind);
    let vertex1 = new THREE.Vector3(positionAttribute.getX(index1), positionAttribute.getY(index1), positionAttribute.getZ(index1));
    let vertex2 = new THREE.Vector3(positionAttribute.getX(index2), positionAttribute.getY(index2), positionAttribute.getZ(index2));
    let vertex3 = new THREE.Vector3(positionAttribute.getX(index3), positionAttribute.getY(index3), positionAttribute.getZ(index3));
    triangle.normal = new THREE.Vector3().crossVectors(vertex2.clone().sub(vertex1), vertex3.clone().sub(vertex1)).normalize();
}

function addTriangle(face, edge, edgeDirection, vertex, updateNormal = true) {
    let geometry = face.geometry;
    let indexAttribute = geometry.index;

    let edgeStartPosIndex = edge.userData.edgeStart.vertex.userData.faceVertexRefers[face.uuid].ind;
    let edgeEndPosIndex = edge.userData.edgeEnd.vertex.userData.faceVertexRefers[face.uuid].ind;
    let vertexPosIndex = vertex.userData.faceVertexRefers[face.uuid].ind;

    let ind = indexAttribute.freeIndex++;
    if (edgeDirection) indexAttribute.setXYZ(ind, edgeStartPosIndex, edgeEndPosIndex, vertexPosIndex);
    else indexAttribute.setXYZ(ind, edgeEndPosIndex, edgeStartPosIndex, vertexPosIndex);

    let inverseIndexAttribute = face.userData.inverseIndex;
    let triangle = {
        ind: ind,
        edgeDirection: edgeDirection,
        normal: new THREE.Vector3(),
    };

    updateTriangleNormal(triangle, face);

    let triangleRef = {
        face: face,
        faceInd: face.userData.triangleRefers.length,
        edge: edge,
        edgeInd: edge.userData.triangleRefers.length,
        vertex: vertex,
        vertexInd: vertex.userData.triangleRefers.length,
        triangle: triangle,
        triangleInd: ind,
    };
    inverseIndexAttribute[ind] = triangle;
    face.userData.triangleRefers.push(triangleRef);
    edge.userData.triangleRefers.push(triangleRef);
    vertex.userData.triangleRefers.push(triangleRef);

    if (updateNormal) updateFaceNormal(face);
}

function calculateFaceGeometry(face) {
    let edgeCount = face.userData.edgeCount;
    let triangleCount = edgeCount - 2;
    let pointCount = face.userData.edgeCount;
    const redundancy = 3;

    let geometry = face.geometry;
    if (geometry === undefined) {
        geometry = new THREE.BufferGeometry();
        face.geometry = geometry;
    }
    geometry.setDrawRange(0, 3 * triangleCount);


    let positionAttribute = geometry.getAttribute('position');
    if (positionAttribute === undefined || positionAttribute.array.length < 3 * pointCount * redundancy) {
        if (positionAttribute !== undefined) positionAttribute.dispose();
        positionAttribute = new THREE.Float32BufferAttribute(new Float32Array(3 * pointCount * redundancy), 3);
        geometry.setAttribute('position', positionAttribute);
    }
    positionAttribute.freeIndex = 0;

    let normalAttribute = geometry.getAttribute('normal');
    if (normalAttribute === undefined || normalAttribute.array.length < 3 * pointCount * redundancy) {
        if (normalAttribute !== undefined) normalAttribute.dispose();
        normalAttribute = new THREE.Float32BufferAttribute(new Float32Array(3 * pointCount * redundancy), 3);
        geometry.setAttribute('normal', normalAttribute);
    }
    normalAttribute.freeIndex = positionAttribute.freeIndex;


    let inversePositionAttribute = face.userData.inversePosition;
    if (!inversePositionAttribute) inversePositionAttribute = undefined;
    if (inversePositionAttribute === undefined || inversePositionAttribute.length < pointCount * redundancy) {
        if (inversePositionAttribute !== undefined) {
            //todo figure out if there is a dispose method
        }
        // inversePositionAttribute = {
        //     array: new Array(pointCount * redundancy),
        //     count: 0,
        //     add: function (vertex) {
        //         this.array[this.count++] = vertex;
        //     }
        // };
        inversePositionAttribute = new Array(pointCount * redundancy);
        face.userData.inversePosition = inversePositionAttribute;
    }

    let indexAttribute = geometry.index ? geometry.index : undefined;
    if (indexAttribute === undefined || indexAttribute.array.length < 3 * triangleCount * redundancy) {
        if (indexAttribute !== undefined) indexAttribute.dispose();
        indexAttribute = new THREE.Uint16BufferAttribute(new Uint16Array(3 * triangleCount * redundancy), 3);//todo don't forget you're using item size 3
        geometry.index = indexAttribute;
    }
    indexAttribute.freeIndex = 0;

    let inverseIndexAttribute = face.userData.inverseIndex;
    if (!inverseIndexAttribute) inverseIndexAttribute = undefined;
    if (inverseIndexAttribute === undefined || inverseIndexAttribute.length < triangleCount * redundancy) {
        if (inverseIndexAttribute !== undefined) {
            //todo figure out if there is a dispose method
        }
        inverseIndexAttribute = new Array(triangleCount * redundancy);
        face.userData.inverseIndex = inverseIndexAttribute;
    }

    let edges = new Array(edgeCount);
    for (let edgeRefer = face.userData.edges, i = 0; edgeRefer !== undefined; edgeRefer = edgeRefer["faceNext"], i++) {
        edges[i] = edgeRefer.edge;
    }
    let directions = new Array(edgeCount);
    for (let i = 0; i < edgeCount; i++) {
        let nextEdge = i + 1 < edges.length ? edges[i + 1] : undefined;
        let prevEdge = i - 1 >= 0 ? edges[i - 1] : undefined;
        let dir = false;
        if (prevEdge) {
            let points = [prevEdge.userData.edgeStart.vertex, prevEdge.userData.edgeEnd.vertex];
            if (points.includes(edges[i].userData.edgeStart.vertex)) {
                dir = true;
            }
        } else {
            let points = [nextEdge.userData.edgeStart.vertex, nextEdge.userData.edgeEnd.vertex];
            if (points.includes(edges[i].userData.edgeEnd.vertex)) {
                dir = true;
            }
        }
        directions[i] = dir;
    }

    let vertices = new Array(pointCount);
    for (let i = 0; i < pointCount; i++) {
        let dir = directions[i];
        if (dir) vertices[i] = edges[i].userData.edgeStart.vertex;
        else vertices[i] = edges[i].userData.edgeEnd.vertex;
        addFaceVertex(face, vertices[i]);
    }

    for (let i = 0; i < triangleCount; i++) {
        let topEdge = edges[((i / 2) | 0)];
        let bottomEdge = edges[edges.length - 2 - ((i / 2) | 0)];
        let edge = (i % 2 === 0) ? topEdge : bottomEdge;
        let edgeDirection = directions[((i / 2) | 0)];
        if (i % 2 === 1) edgeDirection = directions[edges.length - 2 - ((i / 2) | 0)];
        let topVertex = vertices[(((i + 1) / 2) | 0)];
        let bottomVertex = vertices[vertices.length - 1 - (((i + 1) / 2) | 0)];
        let vertex = (i % 2 === 0) ? bottomVertex : topVertex;

        addTriangle(face, edge, edgeDirection, vertex, true); //todo updnorm set to false
    }

    geometry.getAttribute('position').needsUpdate = true;
    geometry.getAttribute('normal').needsUpdate = true;
    geometry.index.needsUpdate = true;
    geometry.needsUpdate = true;
    geometry.matrixWorldNeedsUpdate = true;
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();


    // for (let i = 0; i < triangleCount; i++) {
    //     let topIndex = (i + 1) / 2 | 0;
    //     let bottomIndex = points.length - 1 - (i / 2 | 0);
    //     let triangle = {index: i, face: faceObject, points: [], edges: [], normal: new Vector3()};
    //     faceObject.userData.triangleRefers.push(triangle);
    //     if (i === points.length - 3 && points.length % 2 === 0) {
    //         triangle.edges.push(edges[topIndex]);
    //     }
    //     if (i % 2 === 0) {
    //         triangle.points = [points[topIndex], points[topIndex + 1], points[bottomIndex]];
    //         triangle.edges.push(edges[topIndex]);
    //     } else {
    //         triangle.points = [points[topIndex], points[bottomIndex - 1], points[bottomIndex]];
    //         triangle.edges.push(edges[bottomIndex - 1]);
    //     }
    //     if (i === points.length - 3 && points.length % 2 === 1) {
    //         triangle.edges.push(edges[topIndex + 1]);
    //     }
    //     if (i === 0) triangle.edges.push(edges[bottomIndex]);
    //
    //     for (let j = 0; j < triangle.edges.length; j++) {
    //         let edge = triangle.edges[j];
    //         edge.edge.userData.triangleRefers.push({index: j, triangle: triangle});
    //     }
    //
    //     for (let j = 0; j < triangle.points.length; j++) {
    //         let point = triangle.points[j];
    //         point.userData.triangleRefers.push({index: j, triangle: triangle});
    //         let pointPosition = point.userData.mathObject.clone().sub(faceObject.position);
    //         positionAttribute.setXYZ(i * 3 + j, pointPosition.x, pointPosition.y, pointPosition.z);
    //     }
    //     let pA = triangle.points[0].userData.mathObject;
    //     let pB = triangle.points[1].userData.mathObject;
    //     let pC = triangle.points[2].userData.mathObject;
    //     cb.subVectors(pC, pB);
    //     ab.subVectors(pA, pB);
    //     cb.cross(ab);
    //     triangle.normal.copy(cb);
    // }
    positionAttribute.needsUpdate = true;

    // geometry.computeVertexNormals();

    // let normalAttribute = geometry.getAttribute('normal');
    // if (normalAttribute === undefined || normalAttribute.array.length < arraySize) {
    //     if (normalAttribute !== undefined) normalAttribute.dispose();
    //     normalAttribute = new THREE.BufferAttribute(new Float32Array(arraySize), 3);
    //     geometry.setAttribute('normal', normalAttribute);
    // }
    //
    // faceObject.userData.runningAverageNormal.set(0, 0, 0);
    //
    // for (let i = 0; i < triangleCount; i++) {
    //     let triangle = faceObject.userData.triangleRefers[i];
    //     let normal = triangle.normal;
    //     faceObject.userData.runningAverageNormal.add(normal);
    //     normalAttribute.setXYZ(i * 3 + 0, normal.x, normal.y, normal.z);
    //     normalAttribute.setXYZ(i * 3 + 1, normal.x, normal.y, normal.z);
    //     normalAttribute.setXYZ(i * 3 + 2, normal.x, normal.y, normal.z);
    // }
    //
    // const globalNormal = false; // todo se zafrknav :( trebashe da e true, ama updates kje se poteshki taka
    // if (globalNormal)
    //     for (let i = 0; i < triangleCount * 3; i++) {
    //         normalAttribute.setXYZ(i, faceObject.userData.runningAverageNormal.x, faceObject.userData.runningAverageNormal.y, faceObject.userData.runningAverageNormal.z);
    //     }
    //
    // normalAttribute.needsUpdate = true;
    // geometry.normalizeNormals();
}

function updateVertex(vertex, new_position) {
    vertex.userData.position.copy(new_position);
    vertex.position.copy(new_position);
    vertex.userData.mathObject.copy(vertex.position);


    for (let ref of vertex.userData.triangleRefers) {
        let face = ref.face;
        if (face.userData.locked) continue;
        let triangle = ref.triangle;

        let geometry = face.geometry;

        let positionAttribute = geometry.getAttribute("position");
        let indexAttribute = geometry.index;

        let newPoint = new_position.clone().sub(face.position);

        let indexInd = triangle.ind;
        let vertexPositionInd = indexAttribute.getZ(indexInd);
        positionAttribute.setXYZ(vertexPositionInd, newPoint.x, newPoint.y, newPoint.z);
        positionAttribute.needsUpdate = true;

        updateTriangleNormal(triangle, face);
        updateFaceNormal(face); // todo replace with optimized running average (bellow too)
    }


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


            for (let ref of edge.userData.triangleRefers) {
                let face = ref.face;
                if (face.userData.locked) continue;
                let triangle = ref.triangle;

                let geometry = face.geometry;

                let positionAttribute = geometry.getAttribute("position");
                let indexAttribute = geometry.index;

                let newPoint = new_position.clone().sub(face.position);

                let indexInd = triangle.ind;
                let vertexPositionInd;
                if (refSource === "edgeStartRefers") {
                    if (triangle.edgeDirection) vertexPositionInd = indexAttribute.getX(indexInd);
                    else vertexPositionInd = indexAttribute.getY(indexInd);
                } else {
                    if (triangle.edgeDirection) vertexPositionInd = indexAttribute.getY(indexInd);
                    else vertexPositionInd = indexAttribute.getX(indexInd);
                }


                positionAttribute.setXYZ(vertexPositionInd, newPoint.x, newPoint.y, newPoint.z);
                positionAttribute.needsUpdate = true;

                updateTriangleNormal(triangle, face);
                updateFaceNormal(face); // todo replace with optimized running average (above too)

            }

        }
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

    for (let ref of edge.userData.triangleRefers) {
        let face = ref.face;
        if (face.userData.locked) continue;
        let triangle = ref.triangle;

        let geometry = face.geometry;

        let positionAttribute = geometry.getAttribute("position");
        let indexAttribute = geometry.index;

        let newPoint1 = edgeStart.position.clone().sub(face.position);
        let newPoint2 = edgeEnd.position.clone().sub(face.position);

        let indexInd = triangle.ind;
        let vertexPositionInd1, vertexPositionInd2;
        if (triangle.edgeDirection) {
            vertexPositionInd1 = indexAttribute.getX(indexInd);
            vertexPositionInd2 = indexAttribute.getY(indexInd);
        } else {
            vertexPositionInd2 = indexAttribute.getX(indexInd);
            vertexPositionInd1 = indexAttribute.getY(indexInd);
        }

        positionAttribute.setXYZ(vertexPositionInd1, newPoint1.x, newPoint1.y, newPoint1.z);
        positionAttribute.setXYZ(vertexPositionInd2, newPoint2.x, newPoint2.y, newPoint2.z);
        positionAttribute.needsUpdate = true;

        updateTriangleNormal(triangle, face);
        updateFaceNormal(face); // todo replace with optimized running average
    }


    edge.userData.locked = false;
    edge.userData.position.copy(edge.position);
}

function updateFace(face, new_position) {
    face.position.copy(new_position);
    face.userData.locked = true;
    let translation = face.position.clone().sub(face.userData.position);

    let secondEdge = face.userData.edges["faceNext"];
    let secondEdges = [secondEdge];
    while (secondEdges[secondEdges.length - 1]["faceNext"] !== undefined && secondEdges[secondEdges.length - 1]["faceNext"]["faceNext"] !== undefined) secondEdges.push(secondEdges[secondEdges.length - 1]["faceNext"]["faceNext"]);

    for (let edge of secondEdges) {
        updateEdge(edge.edge, edge.edge.position.clone().add(translation));
    }

    if (face.userData.edgeCount % 2 !== 0) {
        console.log(secondEdges[secondEdges.length - 1]);
        let edge = secondEdges[secondEdges.length - 1]["faceNext"];
        console.log(edge);
        let vertex = edge.dir ? edge.edge.userData.edgeEnd.vertex : edge.edge.userData.edgeStart.vertex;
        updateVertex(vertex, vertex.position.clone().add(translation));
    }

    face.userData.locked = false;
    face.userData.position.copy(face.position);
}

function getVertexContainer(object) {
    return getParent(object).getObjectByName("vertices");
}

function getEdgeContainer(object) {
    return getParent(object).getObjectByName("edges");
}

function getFaceContainer(object) {
    return getParent(object).getObjectByName("faces");
}

function removeVertex(vertex) {
    if (selection !== undefined && selection.object === vertex) deselect();
    while (vertex.userData.edgeStartRefers !== undefined) {
        removeEdge(vertex.userData.edgeStartRefers.edge);
    }
    while (vertex.userData.edgeEndRefers !== undefined) {
        removeEdge(vertex.userData.edgeEndRefers.edge);
    }
    getVertexContainer(vertex).remove(vertex);
}

function removeEdge(edge) {
    if (selection !== undefined && selection.object === edge) deselect();

    while (edge.userData.faceRefers !== undefined) {
        removeFace(edge.userData.faceRefers.face);
    }
    removeRef(edge.userData.edgeStart, "vertex", "edge", "edgeStartRefers", "edgeStart");
    removeRef(edge.userData.edgeEnd, "vertex", "edge", "edgeEndRefers", "edgeEnd");
    getEdgeContainer(edge).remove(edge);
}

function removeFace(face) {
    if (selection !== undefined && selection.object === face) deselect();
    while (face.userData.edges !== undefined) {
        removeDoubleRef(face.userData.edges, "edge", "face", "faceRefers", "edges");
    }
    getFaceContainer(face).remove(face);
}

function addToContainer(container, element) {
    // element.index = container.length;
    container.add(element);
}

function subdivide(object) {
    if (object === null || object === undefined) return;
    let parent = getParent(object);
    let vertices = getVertexContainer(parent);
    let edges = getEdgeContainer(parent);
    let faces = getFaceContainer(parent);
    if (isObjectFace(object)) {
        if (!allowEditFaces || !showEditFaces) return;
        return;
    }
    if (isObjectLine(object)) {
        if (!showEditLines) return;
        let old_edge = object;
        let edgeMiddle = old_edge.position;
        let edgeStart = old_edge.userData.edgeStart.vertex;
        let edgeEnd = old_edge.userData.edgeEnd.vertex;

        let faceEdges = [];
        for (let faceRefer = old_edge.userData.faceRefers; faceRefer !== undefined; faceRefer = faceRefer["edgeNext"]) {
            faceEdges.push({
                forward: [],
                backward: [],
                dir: true,
            });
            for (let edgeRefer = faceRefer["faceNext"]; edgeRefer !== undefined; edgeRefer = edgeRefer["faceNext"]) {
                faceEdges[faceEdges.length - 1].forward.push(edgeRefer.edge);
            }
            for (let edgeRefer = faceRefer["facePrev"]; edgeRefer !== undefined; edgeRefer = edgeRefer["facePrev"]) {
                faceEdges[faceEdges.length - 1].backward.push(edgeRefer.edge);
            }
            if (faceEdges[faceEdges.length - 1].forward.length === 0) {
                let b_edge = faceEdges[faceEdges.length - 1].backward[0];
                let newVar = [b_edge.userData.edgeStart.vertex, b_edge.userData.edgeEnd.vertex];
                if (newVar.includes(faceRefer.edge.userData.edgeEnd.vertex)) faceEdges[faceEdges.length - 1].dir = false;
            } else {
                let f_edge = faceEdges[faceEdges.length - 1].forward[0];
                let newVar = [f_edge.userData.edgeStart.vertex, f_edge.userData.edgeEnd.vertex];
                if (newVar.includes(faceRefer.edge.userData.edgeStart.vertex)) faceEdges[faceEdges.length - 1].dir = false;
            }
        }
        removeEdge(old_edge);

        let new_vertex = getNewVertex(edgeMiddle.x, edgeMiddle.y, edgeMiddle.z);
        addToContainer(vertices, new_vertex);
        let edge1 = getNewEdge(edgeStart, new_vertex);
        let edge2 = getNewEdge(new_vertex, edgeEnd);
        addToContainer(edges, edge1);
        addToContainer(edges, edge2);
        let i = 0;
        for (let faceEdge of faceEdges) {
            let face = getNewFace(
                faceEdge.backward.reverse().concat(faceEdge.dir ? [edge1, edge2] : [edge2, edge1]).concat(faceEdge.forward)
            );
            addToContainer(faces, face);
            if (i++ === 0) {
                console.log("new selection");
                select({object: face});
            }
        }
        render();
        return;
    }
    console.log("what are you subdividing: ", object);
}


if (!WebGL.isWebGLAvailable()) {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
} else {
    init();
}
window.THREE = THREE
