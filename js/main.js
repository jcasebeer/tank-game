window.onload = function() 
{
    "use strict";
    
    var game = new Phaser.Game( 640, 480, Phaser.AUTO, 'game', { preload: preload, create: create, update: update } );
    game.antialias = false;

	// key variables
    var LEFT_FOR, RIGHT_FOR, LEFT_BACK, RIGHT_BACK, KEY_SHOOT;
	
	// camera variables
	var CAMDIR = 0;
	var CAMX = 16000;
	var CAMY = 16000;
	var CAMZ = 0;
	var CAMDIST = 128;

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
        {
            array[i] = [];
        }

        for (var x=0; x<xsize; x++)
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
	
    function createImage(x,y,spr)
    {
        var i = game.make.image(x,y,spr);
        i.anchor.setTo(0.5,0.5);
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
		
		 //variables for projecting the sprites in 3d
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
        var parent = new entity(x,y,choose(['cactus','rock','grass','rock','grass','grass']) );
        for (var i in parent)
            this[i] = parent[i];
        this.fadeIn = 1;
        this.fade = true;
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
    }

    var bitmap;
    var bitmapObject;
	var border;
    var sun;
    var sunFace;
    var angle = 0;
	SEED = 3.98754375;

    function create() 
    {
	   //game.stage.backgroundColor = makeColor(Math.random()*0xff,Math.random()*0xff,Math.random()*0xff);
	   game.stage.backgroundColor = 0x802040;
       game.stage.smoothed = false;
       bitmap = game.add.bitmapData(320,240);
       bitmap.smoothed = false;
       bitmapObject = bitmap.addToWorld();
	   bitmapObject.scale.setTo(2.3);
       bitmapObject.anchor.setTo(0.5,0.5);
       bitmapObject.x = 320;
       bitmapObject.y = 240;

       border = game.add.image(0,0,'border');
       border.scale.setTo(2,2);

       sun = createImage(0,0,'sun');
       sunFace = createImage(0,0,'sunFace');
	   
       LEFT_FOR = addKey(Phaser.Keyboard.Q);
       RIGHT_FOR = addKey(Phaser.Keyboard.P);
       LEFT_BACK = addKey(Phaser.Keyboard.A);
       RIGHT_BACK = addKey(Phaser.Keyboard.L)

       game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
       game.input.onDown.add(fullscreen, this);
	   
	}

    function fullscreen()
    {
        if (game.scale.isFullScreen)
            game.scale.stopFullScreen();
        else
            game.scale.startFullScreen(false);
    }

	function drawSun()
    {
        var offset = Math.atan2(10,10) - degstorads(CAMDIR);
        var scale = CAMDIST / (Math.cos(offset) * 1000);
        var xv = 160+Math.tan(offset)*CAMDIST-scale/2;
        sun.angle-=0.5;

        if (scale<0)
            return;

        bitmap.draw(sun,xv,48);
        bitmap.draw(sunFace,xv,48);
    }

    function manageCacti()
    {
        if ( ~~(CAMX/CACTUS_TILESIZE) !== CAMMAPX || ~~(CAMY/CACTUS_TILESIZE) !== CAMMAPY)
        {
            CAMMAPX = ~~(CAMX/CACTUS_TILESIZE);
            CAMMAPY = ~~(CAMY/CACTUS_TILESIZE);

            var e = ents.length;
            while(e--)
            {
                if (ents[e] instanceof cactus)
                    ents[e].kill();
            }

            for(var x = CAMMAPX-2; x<=CAMMAPX+2; x++)
                for(var y = CAMMAPY-2; y<=CAMMAPY+2; y++)
                {
                    SEED = szudzkik(Math.abs(x),Math.abs(y));
                    for (var i=0; i<12; i++)
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

    function update() 
    {          
        //tread controls
        if(LEFT_FOR.isDown)
        {
            CAMDIR-=0.5;
            CAMX+=lengthdir_x(2,CAMDIR);
            CAMY+=lengthdir_y(2,CAMDIR);
            if (angle>-8)
                angle-=1;
        }
        else if(LEFT_BACK.isDown)
        {
            CAMDIR+=0.5;
            CAMX-=lengthdir_x(2,CAMDIR);
            CAMY-=lengthdir_y(2,CAMDIR);
            if (angle<8)
                angle+=1;
        }

        if(RIGHT_FOR.isDown)
        {
            CAMDIR+=0.5;
            CAMX+=lengthdir_x(2,CAMDIR);
            CAMY+=lengthdir_y(2,CAMDIR);
            if (angle<8)
                angle+=1;

        }
        else if(RIGHT_BACK.isDown)
        {
            CAMDIR-=0.5;
            CAMX-=lengthdir_x(2,CAMDIR);
            CAMY-=lengthdir_y(2,CAMDIR);
            if (angle>-8)
                angle-=1;
        }

        if (angle>8)
            angle = 8;
        if (angle<-8)
            angle = -8;
        if (angle>0)
            angle-=0.2;
        if (angle<0)
            angle+=0.2;

        bitmapObject.angle = angle;
		
        manageCacti();

		var i = ents.length;
		while (i--)
		{
			ents[i].step();
            if (ents[i].alive === false)
            {
                entityDestroy(i);
            }
			ents[i].update();
		}
		
		bitmap.clear();
		bitmap.draw('ground',0,120);
        drawSun();
		ents.sort( function(a,b){ return (a.dist - b.dist)} );
		i = ents.length;
		while (i--)
		{
			ents[i].draw();
		}
		
		bitmap.draw('vignette',0,0);
    }
}