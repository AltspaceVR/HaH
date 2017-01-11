/* global TWEEN, THREE, altspace, Utils, Models, Behaviors, Game */
'use strict';

// force define String.trim
if(typeof(String.prototype.trim) === "undefined")
{
	String.prototype.trim = function(){
		return String(this).replace(/^\s+|\s+$/g, '');
	}
}

// modify behavior of THREE.Object3D.removeEventListener
THREE.Object3D.prototype.removeEventListener = function(type, listener)
{
	if(this._listeners === undefined) return;

	var listenersArray = this._listeners[type];
	if(listenersArray !== undefined)
	{
		var index = listenersArray.indexOf(listener);

		// NEW! remove all listeners if second argument is absent
		if(listener === undefined){
			listenersArray.splice(0);
		}

		else if(index !== -1){
			listenersArray.splice(index, 1);
		}
	}

};


/**************************
	Global variables
**************************/

var renderer;
var camera;
var scene = new THREE.Scene();
var root = new THREE.Object3D();
var gameId;
scene.add(root);

var gameObjects = {};
var tableRadius = 1.65;

var staticPage = [
	'<p style="width:250px; height:350px; background-color:black; color:white;'+
		'font:bold 45px sans-serif; padding:20px; border-radius:5px;">',
		'Holograms<br/>',
		'Against<br/>',
		'Humanity',
	'</p>'
].join('\n');


/**************************
	Initialize scene
**************************/

if( altspace.inClient )
{
	// convert all this altspace craziness into a normal coordinate space
	// i.e. units in meters, z-axis up, with origin on the floor
	renderer = altspace.getThreeJSRenderer({initialSerializationBufferSize: 640000});
	altspace.getEnclosure().then(function(enc)
	{
		// reset coordinate space
		root.scale.set(enc.pixelsPerMeter, enc.pixelsPerMeter, enc.pixelsPerMeter);
		root.position.setY( -enc.innerHeight/2 );
		root.rotation.set( -Math.PI/2, 0, 0 );
		root.userData = enc;

		var enclosureRadius = 0.5 * Math.min(enc.innerWidth, enc.innerDepth) / enc.pixelsPerMeter;
		tableRadius = Math.min(tableRadius, enclosureRadius - 0.3);

		// render 2d version if space is flat
		if( enc.innerDepth < 10 ){
			document.body.innerHTML = staticPage;
		}
		else {
			Utils.preloadAssets(init);
		}
	});

	/*altspace.open(
		'https://docs.google.com/forms/d/1UHU5_WUsz9hoDdkiyiouvl5u49NgNUSA_ZS6qyXOtJk/viewform',
		'_experience', {icon: window.location.origin+'/static/icon.png', hidden: true});*/
}
else
{
	// fake enclosure data
	root.userData = {innerWidth: 3, innerDepth: 3, innerHeight: 3, pixelsPerMeter: 1};

	// set up preview renderer, in case we're out of world
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(1280, 720);
	renderer.setClearColor( 0x888888 );
	document.body.appendChild(renderer.domElement);

	// add an orbiting camera
	camera = new THREE.PerspectiveCamera(45, 1280/720, 0.01, 1000);
	camera.up.set(0,0,5);
	camera.position.set(0, 6*tableRadius, 1.5);
	camera.lookAt( new THREE.Vector3(0, 0, 0) );
	root.add(camera);

	root.add(new THREE.AmbientLight(0xffffff));

	altspace.utilities.shims.cursor.init(scene, camera, {renderer: renderer});

	Utils.preloadAssets(init);
}


function init()
{
	root.addEventListener('cursorenter', Utils.idleClear );
	root.addEventListener('cursorleave', Utils.idleCheck );

	// add table surface
	root.add(Models.table);

	// add game box
	gameObjects.box = Models.box;
	gameObjects.box.position.set(0, 0, 0.8 + 0.025 + 0.07);
	gameObjects.box.rotation.set(Math.PI, 0, 0);
	gameObjects.box.addBehavior(new Behaviors.CursorFeedback());
	root.add(gameObjects.box);

	root.add(Models.boxHoverEffect);

	// add a rotating presentation space
	gameObjects.presentation = new THREE.Object3D();
	gameObjects.presentation.name = 'presentation';
	gameObjects.presentation.position.set(0, 0, 2.5);
	gameObjects.presentation.scale.set(6,6,6);
	gameObjects.presentation.addBehavior( new Behaviors.Rotate(0, 0, 0.5) );

	// add title card
	gameObjects.titleCard = Utils.generateTitleCard();
	gameObjects.titleCard.rotation.set(Math.PI/2, 0, 0);
	gameObjects.titleCard.visible = false;
	gameObjects.presentation.add(gameObjects.titleCard);
	root.add(gameObjects.presentation);

	// grab game id from URL
	gameId = /[?&]gameId=(\w+)\b/.exec(window.location.search);
	if(gameId) gameId = gameId[1];

	// initialize game
	if(!gameId)
	{
		var message = document.createElement('h1');
		message.innerHTML = 'No game room specified! Add a "gameId" query argument.';
		document.body.insertBefore(message, document.body.children[0]);
	}
	else
	{
		Game.connectToGame(gameId);

	}
}


/***************************
	Render loop
***************************/

function render(timestamp)
{
	// update camera if necessary
	if(camera)
	{
		// get client table position
		var seat = root.getObjectByName('seat_'+Game.playerInfo.id);
		if(seat && camera.fov !== 90)
		{
			camera.fov = 90;
			camera.updateProjectionMatrix();
			camera.position.set(0,-0.5, 0.1);
			camera.rotation.set(1.5, 0, 0);
			camera.lookAt( new THREE.Vector3(0, 0, 0) );
			seat.add(camera);
		}
		else if(!seat)
		{
			if(camera.fov !== 45){
				camera.fov = 45;
				camera.updateProjectionMatrix();
			}

			var angle = timestamp/20000 * 2*Math.PI;
			camera.position.x = 3*tableRadius * Math.sin(angle);
			camera.position.y = 3*tableRadius * Math.cos(angle);
			camera.position.z = 1.5;
			camera.lookAt( new THREE.Vector3(0, 0, 1.5) );
		}
	}

	// animate
	scene.updateAllBehaviors();

	TWEEN.update(timestamp);

	// finally, render
	renderer.render(scene, camera);
}

// start animating
window.requestAnimationFrame(function animate(timestamp)
{
	window.requestAnimationFrame(animate);
	render(timestamp);
});
