// INITIALIZE

import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';
import { FirstPersonControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/FirstPersonControls.js';

import { Sky } from 'https://cdn.skypack.dev/three/examples/jsm/objects/Sky.js'

import { GLTFLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/DRACOLoader.js';

import { SpriteText2D, textAlign } from 'https://cdn.skypack.dev/three-text2d';

import { nanoid } from 'https://cdn.jsdelivr.net/npm/nanoid/nanoid.js';

import { GUI } from 'https://cdn.skypack.dev/three/examples/jsm/libs/lil-gui.module.min.js';

import { addCommentToDb, supabaseClient, Testing } from './database_manager.js';

import 'https://cdn.jsdelivr.net/npm/js-md5@0.7.3/src/md5.min.js';

const loader = new GLTFLoader();
const scene = new THREE.Scene(); // init scene
const clock = new THREE.Clock();

const CLICK_DISTANCE = 200;
const MODAL_DISTANCE = 20;
const MOVE_SPEED = 0.5;
const VERTICAL_MOVE_SPEED = 0.5

// TODO: faster loader
//const newloader = new DRACOLoader();
//newloader.setDecoderPath('/examples/js/libs/draco/');
//newloader.preload();

///////////////////////////////////////
//                                   //
//               SCENE               //
//                                   //
///////////////////////////////////////
// camera
const camera = (() => {
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(-218, 13.9, -117);
    camera.rotation.set(-2.0612374314736113, -1.0533215256732134, -2.1217348078257974);
    scene.add(camera);
    return camera;
})();
// lighting 
(() => {
    const ambient_light = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambient_light);
})();
const renderer = (() => {
    const renderer = new THREE.WebGLRenderer({antialias: true}); // init renderer
    document.body.appendChild( renderer.domElement );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.4776;
    return renderer;
})();
const controls = (() => {
    const controls = new FirstPersonControls( camera, renderer.domElement );
    controls.movementSpeed = 20;
    controls.lookSpeed = 0.2;
    controls.enabled = false;
    return controls;
})();

function initSky() {

    // Add Sky
    let sky = new Sky();
    sky.scale.setScalar( 450000 );
    scene.add( sky );

    let sun = new THREE.Vector3();

    // GUI
    const effectController = {
        //turbidity: 10,
        //rayleigh: 3,
        //mieCoefficient: 0.005,
        //mieDirectionalG: 0.7,
        //elevation: 2,
        //azimuth: 180,
        exposure: renderer.toneMappingExposure,
        turbidity: 10.3,
        rayleigh: 3.533,
        mieCoefficient: 0.006,
        mieDirectionalG: 0.416,
        elevation: 0.1,
        azimuth: 180,

    };

    function guiChanged() {
        const uniforms = sky.material.uniforms;
        uniforms[ 'turbidity' ].value = effectController.turbidity;
        uniforms[ 'rayleigh' ].value = effectController.rayleigh;
        uniforms[ 'mieCoefficient' ].value = effectController.mieCoefficient;
        uniforms[ 'mieDirectionalG' ].value = effectController.mieDirectionalG;

        const phi = THREE.MathUtils.degToRad( 90 - effectController.elevation );
        const theta = THREE.MathUtils.degToRad( effectController.azimuth );

        sun.setFromSphericalCoords( 1, phi, theta );

        uniforms[ 'sunPosition' ].value.copy( sun );

        renderer.toneMappingExposure = effectController.exposure;
        renderer.render( scene, camera );
    }
    guiChanged();

    // init fog particles
    const material = (() => {
    scene.fog = new THREE.FogExp2( '#bbb09b', 0.013 );
        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        for ( let i = 0; i < 15000; i ++ ) {

            const x = 3500 * Math.random() - 2000;
            const y = 3500 * Math.random() - 2000;
            const z = 3500 * Math.random() - 2000;

            vertices.push( x, y, z );

        }
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
        const sprite = new THREE.TextureLoader().load( 'models/dust.png' );


        let material = new THREE.PointsMaterial( { size: 5, sizeAttenuation: true, map: sprite, alphaTest: 0.5, transparent: true } );
        material.color.setHSL( 1.0, 0.3, 0.7 );

        const particles = new THREE.Points( geometry, material );
        scene.add( particles );
        return material;
    })();
    return [ sky, sun, material ];
}
initSky();
let worldPromise = (async () => {
    const world = await new Promise((res, rej) => {
        loader.load('models/FINAL1.glb', res, undefined, rej);
    });
    world.scene.scale.x = 1;
    world.scene.scale.y = 1;
    world.scene.scale.z = 1;
    world.scene.position.y = -1;
    scene.add(world.scene);
    return world;
})();

const USER = window.localStorage.getItem('username') || prompt("What name would you like to comment with?", await fetch("https://random-word-api.herokuapp.com/word?number=2&swear=0").then(res => res.json()).then(x => x.join(' ')));
window.localStorage.setItem('username', USER);

console.log("awaiting world...")
const world = await worldPromise;
console.log("world loaded")
///////////////////////////////////////
//                                   //
//             COMMENTS              //
//                                   //
///////////////////////////////////////
const allComments = {};

function promptForComment() {
    return prompt("Please enter your comment");
}

const getPositionInfrontOfCamera = (camera) => {
    var dist = 3;
    var cwd = new THREE.Vector3();
    camera.getWorldDirection(cwd);
    cwd.multiplyScalar(dist);
    cwd.add(camera.position);
    return [cwd.x, cwd.y, cwd.z];
}

const initializeComment = () => {
    let message = promptForComment();
    if (message === null) return;
    addCommentToDb(USER, message, getPositionInfrontOfCamera(camera), []);
}

supabaseClient
    .from('comments')
    .on('INSERT', payload => {
        allComments[payload.id] = new CommentThread(payload);
    }).subscribe();

supabaseClient
    .from('comments')
    .on('UPDATE', payload => {
        if (active_comment?.dbid === payload.new.id) {
            active_comment.toplevel = new Comment(payload.new, active_comment);
            active_comment.beANarcissist();
        }
    }).subscribe();

supabaseClient
    .from('comments')
    .select()
    .then(comments => {
        comments.body.forEach(c => {
            allComments[c.id] = new CommentThread({ new: c });
        });
    });

// MESHES
class Comment {
    constructor(wtfisavnew, parent_thread) {
        this.user = wtfisavnew.user;
        this.text = wtfisavnew.text || "[nothing]";
        this.children = wtfisavnew.children?.map(c => new Comment(c, parent_thread)) || [];
        this.parent_thread = parent_thread;
        this.session_id = nanoid();
    }
    render() {
        // react moment
        setTimeout(() => {
            document.getElementById(`clickhandle-autogen-${this.session_id}`)
                .addEventListener('click', () => {
                    const content = promptForComment();
                    if (content === null) return;
                    this.addReply(USER, content);
                });
        }, 1, { once: true });
        // TODO: make sure event listeners are killed when events are killed, or we will memory leak to all hell
        return `
        <div class="pointer-events-auto select-auto border-red-400">
            <div class="rounded-md p-2" style="background-color: rgba(32, 32, 32, 0.2);">
                <span class="text-gray-200 font-mono">${this.user}</span>
                <span class="text-gray-400 font-mono">said  <a id="clickhandle-autogen-${this.session_id}" class="text-xs">(reply)</a>
                <br>
                <div class="p-4 text-gray-50">
                    ${marked.parse(this.text)}
                </div>
            </div>
            ${
                this.children.length > 0 ? 
        `<details open class="pointer-events-auto select-auto"><summary>${this.children.length} repl${this.children.length > 1 ? 'ies' : 'y'}...</summary>
            <div class="border-red-700 pl-4">
            ${this.children.map(c => c.render()).join('\n')}
            </div>
            </details>
        </div>` : ""
            }
        <br>
        `;
    }
    serialize() {
        return { user: this.user, text: this.text, children: this.children.map(c => c.serialize()) };
    }
    addReply(user, text) {
        this.children.push(new Comment({ user, text, children: [] }, this.parent_thread));
        this.parent_thread.uploadSelf();
    }
}

let active_comment = null;
let clickables = [];    // must implement handleClick(clickevent)
class CommentThread {
    constructor(wtfisav) {
        this.mesh = new THREE.Mesh(
            new THREE.OctahedronBufferGeometry(0.5),
            new THREE.MeshStandardMaterial({ color: "#35FFF8" }),
        );

        this.mesh.position.set(...wtfisav.new.coords);
        this.mesh.rotation.set(0, Math.random() * 10, 0);
        this.mesh.cursor = 'pointer';
        this.mesh.click_parent = this;
        this.dbid = wtfisav.new.id;
        scene.add(this.mesh);

        this.toplevel = new Comment(wtfisav.new, this);

        clickables.push(this);
    }
    handleClick(_) {
        if (active_comment !== null) return;    // only start displaying a comment if nothing is currently active
        active_comment = this;
        geofence_manager.updateTarget(null);
        this.beANarcissist();
        document.getElementsByTagName('canvas')[0]  // get the threejs canvas
            .addEventListener('click', this.blur, { once: true });
    }
    beANarcissist() {
        modal_manager.setHTML(this.toplevel.render());
    }
    blur() {
        modal_manager.clear();
        setTimeout(() => { active_comment = null; }, 1);    // TODO: scuffed as hell: delay to ensure active comment null check in handleClick goes through, to disable jumping from one comment to another directly
    }
    uploadSelf() {
        const children = this.toplevel.serialize().children;
        supabaseClient
            .from('comments')
            .update({ children: children })
            .match({ id: this.dbid })
            .then().catch(console.error);
    }
}

const geofenced = (() => {
    const IRISH_FAMINE = `
    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    Great Famine (Ireland)
    <a href="
	https://en.wikipedia.org/wiki/Great_Famine_(Ireland)
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

    The Great Famine, also known as the Great Hunger, the Famine (mostly within Ireland) or the Irish Potato Famine (mostly outside Ireland), was a period of mass starvation and disease in Ireland from 1845 to 1852. With the most severely affected areas in the west and south of Ireland, where the Irish language was dominant, the period was contemporaneously known in Irish as an Drochshaol, loosely translated as "the hard times" (or literally "the bad life"). The worst year of the period was 1847, known as "Black '47". During the Great Hunger, about 1 million people died and more than a million fled the country, causing the country's population to fall by 20–25%, in some towns falling as much as 67% between 1841 and 1851. Between 1845 and 1855, no fewer than 2.1 million people left Ireland, primarily on packet ships but also steamboats and barks—one of the greatest mass exoduses from a single island in history.
A potato infected with late blight, showing typical rot symptoms

<br>
<br>

The proximate cause of the famine was a potato blight which infected potato crops throughout Europe during the 1840s, causing an additional 100,000 deaths outside Ireland and influencing much of the unrest in the widespread European Revolutions of 1848. From 1846, the impact of the blight was exacerbated by the British Whig government's economic policy of laissez-faire capitalism. Longer-term causes include the system of absentee landlordism and single-crop dependence.


<br>
    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    https://en.wikipedia.org/wiki/Great_Famine_(Ireland)
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>
    `

    const COMPROMISE_1850 = `
    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    Compromise of 1850
    <a href="
	https://en.wikipedia.org/wiki/Compromise_of_1850?scrlybrkr=b9099579
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

    The Compromise of 1850 was a package of five separate bills passed by the United States Congress in September 1850 that defused a political confrontation between slave and free states on the status of territories acquired in the Mexican–American War. It also set Texas's western and northern borders and included provisions addressing fugitive slaves and the slave trade. The compromise was brokered by Whig senator Henry Clay and Democratic senator Stephen A. Douglas, with the support of President Millard Fillmore.

<br>
<br>

A debate over slavery in the territories had erupted during the Mexican–American War, as many Southerners sought to expand slavery to the newly-acquired lands and many Northerners opposed any such expansion. The debate was further complicated by Texas's claim to all former Mexican territory north and east of the Rio Grande, including areas it had never effectively controlled. These issues prevented the passage of organic acts to create organized territorial governments for the land acquired in the Mexican–American War. In early 1850, Clay proposed a package of eight bills that would settle most of the pressing issues before Congress. Clay's proposal was opposed by President Zachary Taylor, anti-slavery Whigs like William Seward, and pro-slavery Democrats like John C. Calhoun, and congressional debate over the territories continued. The debates over the bill were the most famous in Congressional history, and the divisions devolved into fistfights and drawn guns on the floor of Congress.


<br>
    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    https://en.wikipedia.org/wiki/Compromise_of_1850?scrlybrkr=b9099579
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>
    `

    const nodes = [
        // top left reasons
        { x: -200, z: -114, size:  30, label: "European Food Shortages", content: IRISH_FAMINE },
        { x: -126, z: -116, size:  20, label: "European Immigration", content: "todo" },
        { x: -207, z: - 38, size:  30, label: "Influx of Escaped Slaves", content: "todo" },
        { x: -127, z: - 86, size:  50, label: "Political Party Welfare", content: "todo" },

        // top right reasons
        { x: - 69, z: -186, size:  20, label: "Stephen Douglass Philosophy", content: "todo" },
        { x: - 11, z: -168, size:  30, label: "Expansion and Industrialization", content: "todo" },

        // bottom left
        { x: -175, z:   61, size:  30, label: "Compromise of 1850", content: COMPROMISE_1850 },
        { x: -134, z:  112, size:  30, label: "Free Labor Ideology", content: "todo" },
        { x: -114, z:   63, size:  45, label: "Anti-slavery Sentiment", content: "todo" },
        { x: - 81, z:   11, size:  45, label: "North Harbors Escapees", content: "todo" },

        // bottom center
        { x: - 31, z:   72, size:  35, label: "Cotton is King", content: "todo" },
        { x: - 25, z:   24, size:  20, label: "Strong Economic Incentives", content: "todo" },

        // central three themes
        { x: - 34, z: - 67, size:  90, label: "Fear of Government Overreach", content: "todo" },
        { x: - 48, z: -139, size:  60, label: "State vs Federal Power", content: "todo" },
        { x: - 30, z: - 15, size:  80, label: "Conflict over Slavery", content: "todo" },

        { x:   54, z: - 77, size: 120, label: "The Civil War", y: 17, content: "todo" },
    ]

    function makeTextSprite(text) {
        const ratio = 10;
        const fontsize = 22;

        // prepare canvas
        var canvas = document.createElement('canvas');
        const res_w = canvas.width * ratio;
        const res_h = canvas.width * ratio;
        canvas.width = res_w;
        canvas.height = res_h;
        var ctx = canvas.getContext('2d');
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0); // scale high-res canvas https://stackoverflow.com/a/15666143/10372825

        // draw text
        ctx.font = `bold ${fontsize}px Helvetica`;
        ctx.fillStyle = "#c4daff";
        ctx.strokeStyle = ctx.fillStyle;
        // draw wrapped lines and bounding box
        (() => {
            function getLines(ctx, text, maxWidth) {
                var words = text.split(" ");
                var lines = [];
                var currentLine = words[0];

                for (var i = 1; i < words.length; i++) {
                    var word = words[i];
                    var width = ctx.measureText(currentLine + " " + word).width;
                    if (width < maxWidth) {
                        currentLine += " " + word;
                    } else {
                        lines.push(currentLine);
                        currentLine = word;
                    }
                }
                lines.push(currentLine);
                return lines;
            }
            function drawCentered(line, lines_below) {
                const line_width = ctx.measureText(line);
                ctx.fillText(line, 150 - line_width.width/2, 150 - fontsize * lines_below);
            }
            const lines = getLines(ctx, text, res_w / ratio - 20);
            for (let i=lines.length; i>0; i--) {
                drawCentered(lines[i-1], lines.length-i);
            }
            const max_line_width = lines.map(l => ctx.measureText(l).width).reduce((a, c) => Math.max(a, c), -Infinity);
            ctx.strokeRect(150 - max_line_width/2 - 10, 150-fontsize*lines.length - 2, max_line_width + 20, fontsize*lines.length + 12)
        })();

        // convert canvas to sprite
        var texture = new THREE.Texture(canvas) 
        texture.needsUpdate = true;
        var spriteMaterial = new THREE.SpriteMaterial( { map: texture } );
        spriteMaterial.depthTest = false;
        var sprite = new THREE.Sprite( spriteMaterial );
        sprite.scale.set(fontsize, fontsize, fontsize);
        return sprite;  
    }

    console.log('creating textual labels...')
    const geofenced = nodes.map(n => {
        // label text
        const label = makeTextSprite(n.label);
        label.position.x = n.x;
        label.position.z = n.z;
        label.position.y = n.y || 7;
        scene.add(label);

        // label light
        const light = new THREE.PointLight(0xffffff, 1, n.size || 30);
        light.position.set(n.x, n.y + 3 || 10, n.z);
        scene.add(light);

        return { mesh: label, content: n.content };
    });

    return geofenced;
})();

// events
window.addEventListener('keydown', onDocumentKeyDown, false);
window.addEventListener('keyup', onDocumentKeyUp, false);

let up = false;
let down = false;
let manual_move = true;
let moving = [0, 0, 0, 0]
function onDocumentKeyDown( e ) {
    if (e.which == 81) {
        up = true;
    } else if (e.which == 69) {
        down = true;
    } else if (e.which == 67) {
	initializeComment();
    } else if (e.key === 'Shift') {
        controls.enabled = true;
	manual_move = false;
    } else if (e.which == 87) {
	moving[0] = 1;
    } else if (e.which == 65) {
	moving[1] = 1;
    } else if (e.which == 83) {
	moving[2] = 1;
    } else if (e.which == 68) {
	moving[3] = 1;
    } else if (e.which == 84) { // testing!
	Testing();
    }
}

function onDocumentKeyUp( e ) {
    if (e.which == 81) {
        up = false;
    } else if (e.which == 69) {
        down = false;
    } else if (e.key === 'Shift') {
        controls.enabled = false;
	manual_move = true;
    } else if (e.which == 87) {
	moving[0] = 0;
    } else if (e.which == 65) {
	moving[1] = 0;
    } else if (e.which == 83) {
	moving[2] = 0;
    } else if (e.which == 68) {
	moving[3] = 0;
    }
};

let hovered_object = null;
function updateHoveredObject(all_objs=scene.children) {
    hovered_object = null;
    raycaster.setFromCamera( mouse, camera );
    for (let obj of raycaster.intersectObjects( all_objs )) {
        if (obj.distance < CLICK_DISTANCE && typeof obj.object.hasOwnProperty('click_parent')) {
            hovered_object = obj;
            break;
        }
    }
}

document.getElementsByTagName('canvas')[0].addEventListener('click', onDocumentMouseDown, false);
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
function onDocumentMouseDown( event ) {
    event.preventDefault();

    console.log(camera.position, camera.rotation);

    mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;

    updateHoveredObject(clickables.map(o => o.mesh));
    if (hovered_object !== null && !controls.enabled) {
        hovered_object.object.click_parent.handleClick(event);
    }
}

document.addEventListener('resize', e => {
    // TODO handle resizes
    console.log('resized!')
    renderer.setSize( window.innerWidth, window.innerHeight );
    controls.handleResize();
});

class ModalManager {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
    }
    setHTML(html) {
        this.sidebar.style.display = 'block';
        if (html == this.sidebar.innerHTML) return;
        this.sidebar.innerHTML = html;
    }
    clear() {
        this.sidebar.style.display = 'none';
    }
}
const modal_manager = new ModalManager();

class GeofencedModalManager {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.target = null;
    }
    updateTarget(obj) {
        if (obj === this.target) return;
        if (active_comment !== null) return;    // get overriden by active comment
        this.target = obj;
        this.updateContent();
    }
    updateContent(content = null) {
        if (active_comment !== null) return;
        if (this.target === null) {
            modal_manager.clear();
        } else {
            if (content !== null) this.target.content = content;
            modal_manager.setHTML(this.target.content);
        }
    }
}
const geofence_manager = new GeofencedModalManager;

// ANIMATION LOOP
function animate(timestamp) {
    requestAnimationFrame( animate );
    renderer.setSize( window.innerWidth, window.innerHeight );

    if (up) { camera.position.y += VERTICAL_MOVE_SPEED; }
    if (down) { camera.position.y -= VERTICAL_MOVE_SPEED; }
    if (manual_move) {
        if (moving[0]) { camera.translateZ( -MOVE_SPEED ) }
        if (moving[1]) { camera.translateX( -MOVE_SPEED ) }
        if (moving[2]) { camera.translateZ(  MOVE_SPEED ) }
        if (moving[3]) { camera.translateX(  MOVE_SPEED ) }
    }

    for (const c of Object.values(allComments)) {
        c.mesh.rotation.y += 0.0025
    }

    // TODO: is there a better way of finding the nearest object?
    (() => {
        let min_dist = null;
        let nearest = null;
        for (let obj of geofenced) {
            const cam_dist = new THREE.Vector3();
            const dist = cam_dist.subVectors(camera.position, obj.mesh.position).length();
            if (min_dist === null || dist < min_dist) {
                min_dist = dist;
                nearest = obj;
            }
        }
        if (active_comment === null) {
            if (nearest !== null && min_dist <= MODAL_DISTANCE) {
                geofence_manager.updateTarget(nearest);
            } else {
                geofence_manager.updateTarget(null);
            }
        }
    })();

    updateHoveredObject();

    controls.update( clock.getDelta() );
    renderer.render( scene, camera );
}
animate();

