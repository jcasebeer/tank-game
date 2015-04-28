window.onload = function() 
{
	"use strict";

	var game = new Phaser.Game( 640, 480, Phaser.AUTO, 'game', { preload: preload, create: create, update: update } );
	game.antialias = false;

	// key variables
	var LEFT_FOR, RIGHT_FOR, LEFT_BACK, RIGHT_BACK, KEY_SHOOT;

	// sounds
	var snd_shoot,snd_explode,snd_hurt,snd_bump,snd_blip,snd_bloop;

	// camera variables
	var CAMDIR = 0;
	var CAMX = 16000;
	var CAMY = 16000;
	var CAMZ = 0;
	var CAMDIST = 128;
	var SCREEN_SHAKE = 0;
	var CAN_SHOOT = true;
	var RECOIL = 0;
	var SHIELDS = 100;

	// tank spawner vars
	var TANKS = 0;
	var CURRENT_MAX = 1;
	var MAX_TANKS = 64;
	var WAVE_TIMER = 10*60;

	// sky color variables
	var h=340; // sky hue
	var skyChange = 0; 
	var skyCycle = 0.02;

	// cactus variables
	var CACTUS_TILESIZE = 400;
	var CAMMAPX = 0;
	var CAMMAPY = 0;

	// create a list to store our game entities
	var ents = [];

	//Define some useful functions

	function array2d(xsize,ysize,val)
	{
		var array = [];
		for(var i = 0; i<xsize; i++)
			array[i] = [];

		for(var x=0; x<xsize; x++)
			for(var y=0; y<ysize; y++)
				array[x][y] = val;

		return array;
	}

	function addKey(key)
	{
		game.input.keyboard.addKeyCapture(key);
		return game.input.keyboard.addKey(key);
	}


	function clamp(val,min,max)
	{
		if (val<min)
			return min;
		if (val>max)
			return max;
		return val;
	}

	function randomInt(max)
	{
		var i = Math.random()*(max+1)
		return ~~(i);
	}

	function choose(choices)
	{
		var index = ~~(rand()*choices.length);
		return choices[index];
	}

	function degstorads(degs) 
	//Given Degrees, Return Radians
	{

		return degs * (Math.PI/180);
	}

	function lengthdir_x(len,dir)
	//given a length and an angle (in Degrees), return the horizontal (x) component of 
	//the vector of the angle and direction
	{

		return len * Math.cos(degstorads(dir));
	}

	function lengthdir_y(len,dir)
	// Performs the same function as lengthdir_x, but returns the vertical component
	{

		return len * Math.sin(degstorads(dir));
	}

	function point_distance(x1,y1,x2,y2) 
	// Returns the distance between two points
	// will be used to perform circle collisions
	{
		var xdif = x1-x2;
		var ydif = y1-y2;
		return Math.sqrt(xdif*xdif+ydif*ydif);
	}

	function point_direction(x1,y1,x2,y2)
	// return as a degree the angle between two points
	{
		var xdif = x2 - x1;
		var ydif = y2 - y1;

		return Math.atan2(ydif,xdif)*180 / Math.PI;
	}

	var SEED;
	function rand()
	// random number generator for javascript that I found on stackoverflow,
	// because you apparently can't seed javascripts built in rng
	// found here: http://stackoverflow.com/questions/521295/javascript-random-seeds
	{
		var rand = Math.sin(++SEED)*10000;
		return rand - Math.floor(rand);
	}

	function szudzkik(x,y)
	// pairing function
	{
		if (x<y)
			return y*y+x;
		else
			return x*x+x+y;
	}

	function makeColor(r,g,b)
	{

		return 0x000000 | (r << 16) | (g<<8) | b;
	}


	function makeColorHSV(h, s, v) 
	// function taken from 
	// http://snipplr.com/view/14590/hsv-to-rgb/
	{
		var r, g, b;
		var i;
		var f, p, q, t;

		// Make sure our arguments stay in-range
		h = Math.max(0, Math.min(360, h));
		s = Math.max(0, Math.min(100, s));
		v = Math.max(0, Math.min(100, v));

		// We accept saturation and value arguments from 0 to 100 because that's
		// how Photoshop represents those values. Internally, however, the
		// saturation and value are calculated from a range of 0 to 1. We make
		// That conversion here.
		s /= 100;
		v /= 100;

		if(s == 0)
		{
			// Achromatic (grey)
			r = g = b = v;
			return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
		}

		h /= 60; // sector 0 to 5
		i = Math.floor(h);
		f = h - i; // factorial part of h
		p = v * (1 - s);
		q = v * (1 - s * f);
		t = v * (1 - s * (1 - f));

		switch(i) 
		{
			case 0:
				r = v;
				g = t;
				b = p;
				break;

			case 1:
				r = q;
				g = v;
				b = p;
				break;

			case 2:
				r = p;
				g = v;
				b = t;
				break;

			case 3:
				r = p;
				g = q;
				b = v;
				break;

			case 4:
				r = t;
				g = p;
				b = v;
				break;

			default: // case 5:
				r = v;
				g = p;
				b = q;
		}

		return makeColor(r*255,g*255,b*255);
	}

	function createImage(x,y,spr)
	{
		var i = game.make.image(x,y,spr);
		i.anchor.setTo(0.5,0.5);
		return i;
	}

	function addSound(sound)
	{
		var i  = game.add.audio(sound);
		i.allowMultiple = true;
		return i;
	}

	function entityCreate(ent)
	//adds an entity to the entity list 
	{

		ents.push(ent);
	}

	function entityDestroy(i)
	// destroys the entities Phaser image and removes it from the entity list
	{
		ents[i].destroy();
		ents[i].ph.destroy();
		ents.splice(i,1);
	}

	function entity(x,y,sprite)
	{
		this.x = x;
		this.y = y;
		this.sprite = sprite;
		this.radius = 8;
		this.alive = true;
		this.visible = true;

		this.ph = game.make.image(0,150+CAMZ,this.sprite);
		this.ph.anchor.setTo(0.5,0.5);
		
		// variables for projecting the sprites in 3d
		this.xv = 0;
		this.yv = 0;
		this.dist = point_distance(CAMX,CAMY,this.x,this.y);
		this.offset = 0;
		this.scale = 0;
		this.fadeIn = 0;
		this.fade = false;
		
		this.update = function()
		{
			this.dist = point_distance(CAMX,CAMY,this.x,this.y);
		}

		this.step = function(){}

		this.destroy = function(){}

		this.kill = function()
		{
			this.alive = false;
		}

		this.draw = function()
		{
			if (this.fadeIn<1)
				this.fadeIn+=0.1;

			this.xv = this.x - CAMX;
			this.yv = this.y - CAMY;

			this.offset = Math.atan2(this.yv,this.xv) - degstorads(CAMDIR);
			this.scale = ( CAMDIST/(Math.cos(this.offset)*this.dist) )*this.fadeIn;

			if (this.scale<=0 || this.scale>=CAMDIST)
				return;

			this.ph.x = 160+Math.tan(this.offset)*CAMDIST - this.scale/2;
			this.ph.y = 120+CAMZ;

			this.ph.scale.setTo(this.scale,this.scale);
			if (this.fade)
				this.ph.frame = (clamp(this.dist,0,1000)/1000)*0xf | 0;
			bitmap.draw(this.ph);
		}
	}

	function cactus(x,y)
	{
		this.solid = false;
		var type = choose(['cactus','rock','grass','rock','grass','grass']);
		if(type === 'cactus')
			this.solid = true;

		var parent = new entity(x,y,type);
		for(var i in parent)
			this[i] = parent[i];

		this.fadeIn = 1;
		this.fade = true;
	}

	function bullet(x,y,dir,target)
	{
		var parent = new entity(x,y,'bullet');
		for(var i in parent)
			this[i] = parent[i];

		target = target || 1;
		this.target = target;
		this.fade = true;
		this.dir = dir;
		this.life = 200;
		this.fadeIn = 2;

		var volume = 1-clamp(this.dist,0,800)/800;
		if(volume > 0.1)
			snd_shoot.play('',0,volume);

		this.step = function()
		{
			this.x+=lengthdir_x(8,this.dir);
			this.y+=lengthdir_y(8,this.dir);
			this.ph.angle+=6;

			if(this.fadeIn>1)
				this.fadeIn-=0.1;

			this.life--;
			if(this.life<0)
			{
				this.kill();
			}

			if(this.target === 2)
			{
				if(point_distance(this.x,this.y,CAMX,CAMY)<16)
				{
					this.kill();
					entityCreate( new explode(this.x,this.y,2) );
					SCREEN_SHAKE = 32;
					SHIELDS-=10;
					snd_hurt.play();
				}
			}

			for(var i in ents)
			{
				if(ents[i].alive)
				{
					if( ents[i] instanceof cactus && ents[i].solid)
						if(point_distance(this.x,this.y,ents[i].x,ents[i].y)<12)
						{
							entityCreate( new explode(this.x,this.y) );
							this.kill();
							break;
						}

				if(ents[i] instanceof tank && this.target === 1)
					if(point_distance(this.x,this.y,ents[i].x,ents[i].y)<32)
					{
						this.x+=lengthdir_x(8,this.dir);
						this.y+=lengthdir_y(8,this.dir);
						entityCreate( new explode(this.x,this.y,3));
						this.kill();
						ents[i].kill();
						SCREEN_SHAKE+=8;
						break;
					}
				}
			}
		}
	}

	function explode(x,y,size)
	{
		var parent = new entity(x,y,'explode');
		for(var i in parent)
			this[i] = parent[i];

		size = size || 1.5;
		this.ph.angle = Math.random()*360;
		this.f = 0;
		SCREEN_SHAKE+=8;
		this.fadeIn = size;

		var volume = 1-clamp(this.dist,0,1000)/1000;
		if(volume>0.1)
			snd_explode.play('',0,volume);

		this.step = function()
		{
			this.f+=0.5;
			this.ph.frame = this.f|0;

			if(this.f>15)
			this.kill();
		}
	}

	function tank(x,y)
	{
		var parent = new entity(x,y,'tank');
		for(var i in parent)
			this[i] = parent[i];

		this.dir = 0;
		this.targetDir = choose([-1,1]);

		this.step = function()
		{
			if(Math.random()<.05)
			{
				this.targetDir = choose([1,-1]);
				if(Math.random()<0.25)
					this.targetDir = 0;
			}
			if(this.dist>400)
			{
				this.dir = point_direction(this.x,this.y,CAMX,CAMY);
				this.targetDir = 0;
			}

			if(this.targetDir === 0 && this.dist<=400)
				this.targetDir = choose([1,-1]);


			this.dir+=this.targetDir*2;
			this.dir = this.dir%360;
			this.ph.frame = (4-(this.dir-point_direction(this.x,this.y,CAMX,CAMY))%360/90)|0;
			this.x+=lengthdir_x(1,this.dir);
			this.y+=lengthdir_y(1,this.dir);

			if(this.ph.frame === 3 && this.dist<400)
			{
				if(Math.random()<0.016)
				{
					entityCreate( 
					new bullet(
						this.x,
						this.y,
						point_direction(this.x,this.y,CAMX,CAMY)+Math.random()*8-4,
						2)
					);
				}
			}
		}
	}

	function preload() 
	{
		game.load.image('vignette','assets/vig.png');
		game.load.image('sun','assets/sun.png');
		game.load.image('sunFace','assets/sunface.png');
		game.load.image('border','assets/border.png');
		game.load.spritesheet('cactus','assets/cactus.png',32,32);
		game.load.spritesheet('rock','assets/rock.png',32,32);
		game.load.spritesheet('grass','assets/grass.png',32,32);
		game.load.image('ground','assets/ground.png');
		game.load.spritesheet('explode','assets/explodeTiles.png',32,32);
		game.load.spritesheet('bullet','assets/bullet.png',32,32);
		game.load.spritesheet('tank','assets/tank.png',32,32);
		game.load.image('crosshair','assets/crosshair.png');

		game.load.image('mountain','assets/mountain.png');
		game.load.image('crag','assets/crag.png');
		game.load.image('tree','assets/tree.png');

		game.load.audio('snd_shoot','assets/shoot.ogg',true);
		game.load.audio('snd_explode','assets/explode.ogg',true);
		game.load.audio('snd_hurt','assets/hurt.ogg',true);
		game.load.audio('snd_bump','assets/bump.ogg',true);

		game.load.audio('snd_blip','assets/blip.ogg',true);
		game.load.audio('snd_bloop','assets/bloop.ogg',true);
	}

	var bitmap;
	var bitmapObject;
	var border;
	var text;
	var sun;
	var sunFace;
	var angle = 0;
	SEED = 3.98754375;

	function create() 
	{
		game.stage.backgroundColor = 0x802040;
		game.stage.smoothed = false;
		bitmap = game.add.bitmapData(320,240);
		bitmap.smoothed = false;
		bitmapObject = bitmap.addToWorld();
		bitmapObject.scale.setTo(2.3);
		bitmapObject.anchor.setTo(0.5,0.5);
		bitmapObject.x = 320;
		bitmapObject.y = 240;

		text = game.add.text(8,8,"",{
			font: "16px Lucida Console",
			fill: "#ffffff",
		});

		border = game.add.image(0,0,'border');
		border.scale.setTo(2,2);

		sun = createImage(0,0,'sun');
		sunFace = createImage(0,0,'sunFace');

		snd_shoot = addSound('snd_shoot');
		snd_explode = addSound('snd_explode');
		snd_hurt = addSound('snd_hurt');
		snd_blip = addSound('snd_blip');
		snd_bloop = addSound('snd_bloop');

		snd_bump = addSound('snd_bump');
		snd_bump.allowMultiple = false;

		LEFT_FOR = addKey(Phaser.Keyboard.Q);
		RIGHT_FOR = addKey(Phaser.Keyboard.P);
		LEFT_BACK = addKey(Phaser.Keyboard.A);
		RIGHT_BACK = addKey(Phaser.Keyboard.L)
		KEY_SHOOT = addKey(Phaser.Keyboard.SPACEBAR);

		game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
		game.input.onDown.add(fullscreen, this);
	}

	function fullscreen()
	{
		if(game.scale.isFullScreen)
			game.scale.stopFullScreen();
		else
			game.scale.startFullScreen(false);
	}

	function rotateSc(x,y,scen)
	// do math to rotate scenery
	{
		var i = Math.atan2(x,y) - degstorads(CAMDIR);
		var s = CAMDIST / (Math.cos(i) *1000);
		var xs = 160+Math.tan(i)*CAMDIST - s/2;

		if(s<=0)
			return;
		bitmap.draw(scen,xs,88);
	}

	function drawSun()
	{
		var offset = Math.atan2(10,10) - degstorads(CAMDIR);
		var scale = CAMDIST/ (Math.cos(offset)*1000);
		sun.angle-=0.5;
		var xv =160+Math.tan(offset)*CAMDIST -scale/2;

		if(scale>0)
		{
			bitmap.draw(sun,xv,48);
			bitmap.draw(sunFace,xv,48);
		}

		rotateSc(10,-10,'tree');
		rotateSc(-10,10,'crag');
		rotateSc(-10,-10,'mountain');
	}

	function manageCacti()
	{
		if( ~~(CAMX/CACTUS_TILESIZE) !== CAMMAPX || ~~(CAMY/CACTUS_TILESIZE) !== CAMMAPY)
		{
			CAMMAPX = ~~(CAMX/CACTUS_TILESIZE);
			CAMMAPY = ~~(CAMY/CACTUS_TILESIZE);

			var e = ents.length;
			while(e--)
			{
				if(ents[e] instanceof cactus)
					ents[e].kill();
			}

			for(var x = CAMMAPX-2; x<=CAMMAPX+2; x++)
				for(var y = CAMMAPY-2; y<=CAMMAPY+2; y++)
				{
					SEED = szudzkik(Math.abs(x),Math.abs(y));
					for(var i=0; i<12; i++)
					{
						entityCreate(
							new cactus(
							x*CACTUS_TILESIZE+rand()*CACTUS_TILESIZE,
							y*CACTUS_TILESIZE+rand()*CACTUS_TILESIZE
							)
						);
					}
				}
		}
	}

	function controlTank()
	{
		//tread controls
		if(LEFT_FOR.isDown)
		{
			CAMDIR-=0.5;
			CAMX+=lengthdir_x(2,CAMDIR);
			CAMY+=lengthdir_y(2,CAMDIR);
			if(angle<8)
				angle+=1;
		}
		else if(LEFT_BACK.isDown)
		{
			CAMDIR+=0.5;
			CAMX-=lengthdir_x(2,CAMDIR);
			CAMY-=lengthdir_y(2,CAMDIR);
			if(angle>-8)//
				angle-=1;
		}

		if(RIGHT_FOR.isDown)
		{
			CAMDIR+=0.5;
			CAMX+=lengthdir_x(2,CAMDIR);
			CAMY+=lengthdir_y(2,CAMDIR);
			if(angle>-8)//
				angle-=1;
		}
		else if(RIGHT_BACK.isDown)
		{
			CAMDIR-=0.5;
			CAMX-=lengthdir_x(2,CAMDIR);
			CAMY-=lengthdir_y(2,CAMDIR);
			if(angle<8)
				angle+=1;
		}

		if(KEY_SHOOT.isDown)
		{
			if(CAN_SHOOT && RECOIL ===0)
			{
				entityCreate(new bullet(CAMX,CAMY,CAMDIR+Math.random()*8 - 4));
				SCREEN_SHAKE+=8;
				RECOIL = 32;
				CAN_SHOOT = false;
			}
		}
		else
		{

			CAN_SHOOT = true;
		}

		if(RECOIL>0)
			RECOIL-=1;

		for(var i in ents)
		{
			if(ents[i].alive)
			{
				if( ents[i] instanceof cactus && ents[i].solid)
					if(ents[i].dist<16)
					{
						var backDir = point_direction(ents[i].x,ents[i].y,CAMX,CAMY);
						CAMX+=lengthdir_x(4,backDir);
						CAMY+=lengthdir_y(4,backDir);
						snd_bump.play();
						break;
					}

				if( ents[i] instanceof tank)
					if(ents[i].dist<32)
					{
						var backDir = point_direction(ents[i].x,ents[i].y,CAMX,CAMY);
						CAMX+=lengthdir_x(4,backDir);
						CAMY+=lengthdir_y(4,backDir);
						snd_bump.play();
						break;
					}
			}
		}

		if(angle>8)
			angle = 8;
		if(angle<-8)
			angle = -8;
		if(angle>0)
			angle-=0.2;
		if(angle<0)
			angle+=0.2;

		bitmapObject.angle = angle;
	}

	function tankSpawner()
	{
		if(TANKS === 0)
		{
			if(WAVE_TIMER===0)
			{
				WAVE_TIMER = 10*60;
				snd_bloop.play();
				for(var i =0; i<CURRENT_MAX; i++)
				{
					TANKS++;
					var d = Math.random()*360;
					entityCreate(new tank(CAMX+lengthdir_x(800,d),CAMY+lengthdir_y(800,d)) );
				}
				if(CURRENT_MAX<MAX_TANKS)
					CURRENT_MAX++;
			}
			else
			{
				WAVE_TIMER--;
				if(~~(WAVE_TIMER/60) !== ~~((WAVE_TIMER+1)/60) )
					snd_blip.play();
			}
		}
	}

	function update() 
	{
		tankSpawner();

		text.setText(
			"SHIELDS - "+ SHIELDS+"%"+
			"\nWAVE - " + (CURRENT_MAX-1)+
			"\nWAVE TIMER - "+((WAVE_TIMER/60)|0)
		);

		if(SHIELDS>0)
		{

			controlTank();
		}
		else
		{
			if(CAMZ<30)
				CAMZ+=0.5;
			CAMDIR++;
			text.anchor.setTo(0.5,0.5);
			text.x = 320;
			text.y = 240;
			text.setText("GAME OVER\nYOU GOT TO WAVE:"+(CURRENT_MAX-1)+"\nPRESS SPACE TO RESTART");
			if(KEY_SHOOT.isDown)
				location.reload();
		}
		manageCacti();

		if(h<359)
			h++;
		else
			h=0;
		skyChange+=skyCycle;
		game.stage.backgroundColor = makeColorHSV(h,75,50-40*Math.abs(Math.sin(skyChange)));

		var i = ents.length;
		while(i--)
		{
			ents[i].step();
			ents[i].update();
			if(ents[i].alive === false)
			{
				if(ents[i] instanceof tank)
				{
					TANKS--;
				}
			entityDestroy(i);
			}
		}

		if(SCREEN_SHAKE>32)
			SCREEN_SHAKE=32;

		bitmapObject.x = 320+Math.random()*SCREEN_SHAKE - SCREEN_SHAKE/2;
		bitmapObject.y = 240+Math.random()*SCREEN_SHAKE - SCREEN_SHAKE/2;

		if(SCREEN_SHAKE>0)
			SCREEN_SHAKE--;

		bitmap.clear();
		bitmap.draw('ground',0,120);
		drawSun();
		ents.sort( function(a,b){ return (a.dist - b.dist)} );
		i = ents.length;
		while(i--)
		{

			ents[i].draw();
		}

		bitmap.draw('vignette',0,0);
		bitmap.draw('crosshair',156,116-RECOIL);
	}
}
