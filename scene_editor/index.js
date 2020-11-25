$(function () {
    var player = null;
    var sampleRate = 100;
    $('textarea').val(localStorage.getItem('pattern'));
    $('input#play').on('click', function (event) {
        event.preventDefault();
        var pattern = $('textarea').val();
        localStorage.setItem('pattern', pattern);
        var parser = new Parser(pattern);
        var fades = parser.parse();
        
        var sampler = new Sampler(fades, sampleRate);
        var samples = sampler.sample();

        console.log("Number of samples: " + samples.length);
        var output = "{";
        $(samples).each(function () {
            output += this + ','
        });
        output += "}";
        console.log(output);

        if (player) {
            player.stop();
        }
        player = new Player(samples, sampleRate);
        player.play();

        return false;
    });

    $('input#stop').on('click', function (event) {
        event.preventDefault();

        if (player) {
            player.stop();
        }

        return false;
    });
});

var Player = function(samples, sampleRate) {
    this.samples = samples;
    this.sampleRate = parseInt(sampleRate);
    this.body = $('body');
    this.loop = true;

    this.play = function () {
        this.loop = true;
        var self = this;
        var step = 1000 / sampleRate;
        var i = 0;

        var playFrame = function () {
            if (i < self.samples.length) {
                self.draw(self.samples[i]);
                i++;

                setTimeout(playFrame, step)
            }
            else if (self.loop) {
                i = 0;
                playFrame();
            }
        }
        
        playFrame();
    }

    this.stop = function () {
        this.loop = false;
    }

    this.draw = function(value) {
        this.body.css('background-color', 'rgb(' + value + ',0,0)');
    }
}

var Sampler = function(fades, sampleRate) {
    this.fades = fades;
    this.sampleRate = parseInt(sampleRate);
    this.samples = [];

    this.sample = function () {
        this.samples = [];
        var self = this;
        $(this.fades).each(function () {
            self.sampleFade(this);
        });

        return this.samples;
    }

    this.sampleFade = function (fade) {
        var divs = Math.round(fade.interval * (this.sampleRate / 1000));

        for (i = 0; i < divs; i ++) {
            var x = 0;
            if (i > 0) x = i / (divs - 1);

            var val = 0;
            switch (fade.easing) {
                case 4:
                    val = this.easeOutElastic(x);
                    break;
                case 3:
                    val = this.easeInOutQuart(x);
                    break;
                case 2:
                    val = this.easeOutQuart(x);
                    break;
                case 1:
                default:
                    val = this.easeInQuart(x);
            }

            if (fade.vStart <= fade.vStop) {
                this.samples.push(Math.round(val * (fade.vStop - fade.vStart) + fade.vStart));
            }
            else {
                this.samples.push(Math.round(fade.vStart - val * (fade.vStart - fade.vStop)));
            }
        }
    }

    // 1
    this.easeInQuart = function (x) {
        return x * x * x * x;
    }

    // 2
    this.easeOutQuad = function (x) {
        return 1 - Math.pow(1 - x, 4);
    }

    // 3
    this.easeInOutQuart = function (x) {
        return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
    }

    // 4
    this.easeOutElastic = function (x) {
        const c4 = (2 * Math.PI) / 3;
        
        return x === 0
          ? 0
          : x === 1
          ? 1
          : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
        }
}

var Fade = function (vStart, vStop, interval, easing = 1) {
    this.vStart = parseInt(vStart * 255) ;
    this.vStop = parseInt(vStop * 255) ;
    this.interval = parseInt(interval);
    this.easing = easing;
}

var Parser = function (pattern) {
    this.pattern = pattern;

    this.parse = function () {
        var fades = [];
        var fadesRaw = this.pattern.trim().split(";");
        $(fadesRaw).each(function () {
            var elements = this.split(",");
            if (elements.length < 3 || elements.length > 4) {
                alert(this + " is not a valid interval. It should have 3 or 4 elements.");
                throw "Not a valid interval.";
            }
            fades.push(new Fade(elements[0].trim(), 
                elements[1].trim(), 
                elements[2].trim(), 
                elements.length == 4 ? elements[3].trim() : 1))
        });

        return fades;
    }
}