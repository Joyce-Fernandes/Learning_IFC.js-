import { IfcViewerAPI } from 'web-ifc-viewer';
import { Color, Mesh, MeshLambertMaterial } from 'three';

// Setup IFC

const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({container});


// Setup scene

viewer.addAxes();
viewer.addGrid(100, 100);
viewer.clipper.active = true;
viewer.IFC.applyWebIfcConfig({ COORDINATE_TO_ORIGIN: true, USE_FAST_BOOLS: true });
      

// Setup GUI

const GUI = {
    input: document.getElementById('file-input'),
    loader: document.getElementById('loader-button'),
    props: document.getElementById('property-menu'),
    tree: document.getElementById('myUL')
}

GUI.loader.onclick = () => GUI.input.click();

let ifcProject;

GUI.input.onchange = (event) => {
    const file = event.target.files[0];
    const url = URL.createObjectURL(file);
    viewer.IFC.loadIfcUrl(url);
   
} 

// load model

async function loadModel() {
    const model = await viewer.IFC.loadIfcUrl('19-026-L4_UTE_PC01_GEN_MOD_GEN-VIA-VAL_V01.ifc');
    createTreeMenu(model.modelID);   
    
}

loadModel();

// Highlight items when hovering over them

container.onmousemove = () => viewer.IFC.prePickIfcItem();

// Select items and log properties

container.ondblclick = async () => {
    const found = await viewer.IFC.pickIfcItem(true);
    if(found === null || found === undefined) return;
    const props = await viewer.IFC.getProperties(found.modelID, found.id, true);
    updatePropertyMenu(props);
};

var contTotal; //Variable para guardar la cantidad total de línea a exportar.

// Properties menu

function updatePropertyMenu(props) {

    let contId = 0; //Variable para guardar la cantidad total de línea a exportar.

    removeAllChildren(GUI.props);

    const mats = props.mats;
    const psets = props.psets;
    const type = props.type;
    
    delete props.mats;
    delete props.psets;
    delete props.type;



    for(let propertyName in props) {
        const propValue = props[propertyName];
        createPropertyEntry(propertyName, propValue, contId);
    contId++;
    }
    contTotal = contId;
}

//Funcion para crear table temporal
function createtable(contents) {
	var table = document.createElement("table");
	var thead = document.createElement("thead");
	var tbody = document.createElement("tbody");
	var thd = function (i) { return (i == 0) ? "th" : "td"; };
	for (var i = 0; i < contents.length; i++) {
		var tr = document.createElement("tr");
		for (var o = 0; o < contents[i].length; o++) {
			var t = document.createElement(thd(i));
			var text = document.createTextNode(contents[i][o]);
			t.appendChild(text);
			tr.appendChild(t);
		}
		(i == 0) ? thead.appendChild(tr) : tbody.appendChild(tr);
	}
	table.appendChild(thead);
	table.appendChild(tbody);
	table.setAttribute("style", "display: none"); //Ocultar la table
	return table;
}

//Funcion para leer la DIV Properties menu
function exportarDiv() {

	var arrayList = new Array();
	var j = 0;

	arrayList[j] = new Array("name", "value");
	j++;

	for (var i = 0; i < contTotal; i++) {
		arrayList[j] = new Array(document.getElementById('name_' + i).innerHTML, document.getElementById('value_' + i).innerHTML);
		j++;
	}
	document.getElementById("tblExport").appendChild(createtable(arrayList)); //llenando la tabla temporal con los datos de la DIV.
	exportTableToExcel("tblExport"); // Exportando a excel.
}

//Funcion para exportar los datos a excel
function exportTableToExcel(tableID, filename = ''){
    var downloadLink;
    var dataType = 'application/vnd.ms-excel';
    var tableSelect = document.getElementById(tableID);
    var tableHTML = tableSelect.outerHTML.replace(/ /g, '%20');
    
    // Specify file name
    filename = filename?filename+'.xls':'excel_data.xls';
    
    // Create download link element
    downloadLink = document.createElement("a");
    
    document.body.appendChild(downloadLink);
    
    if(navigator.msSaveOrOpenBlob){
        var blob = new Blob(['\ufeff', tableHTML], {
            type: dataType
        });
        navigator.msSaveOrOpenBlob( blob, filename);
    }else{
        // Create a link to the file
        downloadLink.href = 'data:' + dataType + ', ' + tableHTML;
    
        // Setting the file name
        downloadLink.download = filename;
        
        //triggering the function
        downloadLink.click();
    }
}

function createPropertyEntry(key, propertyValue, contId) {
    // contenedor
    const root = document.createElement('div');
    root.classList.add('property-root');
    root.setAttribute("id", "root_" + contId);
    

    // nombre de la propiedad
    const keyElement = document.createElement('div');
    keyElement.classList.add('property-name');
    keyElement.setAttribute("id", "name_" + contId);
    keyElement.textContent = key;
    root.appendChild(keyElement);
    
    // valor de la propiedad
    if(propertyValue === null || propertyValue === undefined) propertyValue = "-";
    else if(propertyValue.value) propertyValue = propertyValue.value;
    
    const valueElement = document.createElement('div');
    valueElement.classList.add('property-value');
    valueElement.setAttribute("id", "value_" + contId);
    valueElement.textContent = propertyValue;
    root.appendChild(valueElement);

    GUI.props.appendChild(root);
}

function removeAllChildren (element) {
    while(element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

// tree menu
var toggler = document.getElementsByClassName("caret");

for (let i = 0; i < toggler.length; i++) {
    const current = toggler[i];
    current.onclick = () => {
        current.parentElement.querySelector(".nested").classList.toggle("active");
        current.classList.toggle("caret-down");
    }
}

async function createTreeMenu(modelID) {
    ifcProject = await viewer.IFC.getSpatialStructure(modelID);
    removeAllChildren(GUI.tree);

    const ifcProjectNode = createNestedChild(GUI.tree, ifcProject);
    ifcProject.children.forEach(child => {
        constructTreeMenuNode(ifcProjectNode, child)
    })
    
}

function constructTreeMenuNode(parent, node) {
    const children = node.children;
    if(children.length === 0) {
        createSimpleChild(parent, node);
        return;
    }
    const nodeElement = createNestedChild(parent, node);
    children.forEach(child => {
        constructTreeMenuNode(nodeElement, child);
    })
}


function createNestedChild(parent, node) {
    const content = nodeToString(node);
    const root = document.createElement('li');
    createNestedNodeTitle(root, content);
    const childrenContainer = document.createElement('ul');
    childrenContainer.classList.add("nested");
    root.appendChild(childrenContainer);
    parent.appendChild(root);
    return childrenContainer;
}

function createNestedNodeTitle(parent, content) {
    const title = document.createElement("span");
    title.classList.add("caret");
    title.onclick = () => {
        title.parentElement.querySelector(".nested").classList.toggle("active");
        title.classList.toggle("caret-down");
    }
    title.textContent = content;
    parent.appendChild(title);
}

function createSimpleChild(parent, node) {
    const childNode = document.createElement('li');
    childNode.classList.add('leaf-node');
    childNode.textContent = nodeToString(node);
    parent.appendChild(childNode);

    childNode.onmouseenter = () => {
        viewer.IFC.prepickIfcItemsByID(0, [node.expressID]);
    }

    childNode.onclick = async () => {
        viewer.IFC.pickIfcItemsByID(0, [node.expressID], true);
        const props = await viewer.IFC.getProperties(0, node.expressID, true);
        updatePropertyMenu(props);
    }
}

function nodeToString(node) {
    return `${node.type} - ${node.expressID}`;
}