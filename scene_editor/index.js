$(function () {
    var player = null;
    var sampleRate = 100;
    var chart = null;
    var samples = [];
    var textarea = $('textarea');
    var play = $('input#play');
    var selector = $('#scenes');

    var scenes = [
        { name: "Xmass", 
          data: 
`0,1,250,2;
1,0,250;
0,0,100;
0,1,250,2;
1,0,250;
0,0,100;
0,1,150,2;
1,0,150;
0,0,50;
0,1,150,2;
1,0,150;
0,0,50;
0,1,150,2;
1,0,150;
0,0,200`},
        { name: "Slow",
          data: 
`0,1,4000,1;
1,1,5000;
1,0,4000,2;
0,0,1500`}
    ];

    scenes.forEach((value, index) => {
        selector.append($('<option>', {
            value: index,
            text: value.name
        }));
    });

    textarea.val(localStorage.getItem('pattern'));
    textarea.on('keydown', function (event) {
        if (event.keyCode == 32) {
            event.preventDefault();
            sampleAndUpdateChart();
            playStop();
        }
    });

    textarea.on('keyup', function (event) {
        selector.val("");
        sampleAndUpdateChart();
    });

    selector.on('change', function (event) {
        textarea.val(scenes[selector.val()].data);
        sampleAndUpdateChart();
        playStop();
    });

    play.on('click', function (event) {
        event.preventDefault();

        sampleAndUpdateChart();

        playStop();
    });

    chart = new Chart($('#scene'), {
        // The type of chart we want to create
        type: 'line',
    
        // The data for our dataset
        data: {
            datasets: [{
                label: 'My First dataset',
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(255, 99, 132)'
            }]
        },
    
        // Configuration options go here
        options: {
            tooltips: {
                enabled: false
            },
            elements: {
                point: {
                    radius: 1,
                    hoverRadius: 1
                }
            },
            legend: false,
            scales: {
                y: {
                    display: false,
                    min: 0,
                    max: 255,
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        display: false
                    }
                },
                x: {
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        autoSkip: false,
                        display: true,
                        major: {
                            display: true
                        }
                    }
                }
            }
        }
    });

    function sampleAndUpdateChart() {
        var pattern = textarea.val();
        localStorage.setItem('pattern', pattern);
    
        var parser = new Parser(pattern);
        var fades = parser.parse();
        
        var sampler = new Sampler(fades, sampleRate);
        samples = sampler.sample();
    
        var labels = [];
        var tick = Math.round(1000 /  sampleRate);
        samples.forEach((step, index) => {
            var value = index * tick;
            labels.push((value % 500 == 0) ? value / 1000 + 's' : '');
        });
        chart.data.labels = labels;
        chart.data.datasets[0].data = samples;
        chart.update('none');
    }

    function playStop() {
        if (player) {
            player.stop();
            player = null;
            play.val("play");
        }
        else {
            player = new Player(samples, sampleRate);
            player.play();
            play.val("stop");
        }
    }
});

var Player = function(samples, sampleRate) {
    this.samples = samples;
    this.sampleRate = parseInt(sampleRate);
    this.body = $('.lightbulb');
    this.progress = $('#progress');
    this.timeout = null;

    this.play = function () {
        var self = this;
        var step = 1000 / sampleRate;
        var i = 0;

        var playFrame = function () {
            if (i < self.samples.length) {
                self.draw(self.samples[i]);
                progress.value = i > 0 ? i / self.samples.length : 0;
                i++;

                self.timeout = setTimeout(playFrame, step)
            }
            else {
                i = 0;
                playFrame();
            }
        }
        
        playFrame();
    }

    this.stop = function () {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
    }

    this.draw = function(value) {
        const from = [48, 48, 48];
        const to = [255, 255, 255];
        const r = from[0] + (to[0] - from[0]) / 255 * value;
        const g = from[1] + (to[1] - from[1]) / 255 * value;
        const b = from[2] + (to[2] - from[2]) / 255 * value;
        this.body.css('background', 'radial-gradient(rgb(' + r + ',' + g + ',' + b + ')' + '50%, rgb(48, 48, 48) 70%)');
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
                case 6:
                    val = this.easeOutExpo(x);
                    break;
                case 5:
                    val = this.easeInExpo(x);
                    break;
                case 4:
                    val = this.easeOutQuart(x);
                    break;
                case 3:
                    val = this.easeInQuart(x);
                    break;
                case 2:
                    val = this.easeOutSine(x);
                    break;
                case 1:
                default:
                    val = this.easeInSine(x);
            }

            this.samples.push(Math.round(val * (fade.vStop - fade.vStart) + fade.vStart));
        }
    }

    // 1
    this.easeInSine = function (x) {
        return 1 - Math.cos((x * Math.PI) / 2);
    }

    // 2
    this.easeOutSine = function (x) {
        return Math.sin((x * Math.PI) / 2);
    }

    // 3
    this.easeInQuart = function (x) {
        return x * x * x * x;
    }

    // 4
    this.easeOutQuart = function (x) {
        return 1 - Math.pow(1 - x, 4);
    }

    // 5
    this.easeInExpo = function (x) {
        return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
    }

    // 6
    this.easeOutExpo = function (x) {
        return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    }
}

var Fade = function (vStart, vStop, interval, easing = 1) {
    this.vStart = parseInt(vStart * 255) ;
    this.vStop = parseInt(vStop * 255) ;
    this.interval = parseInt(interval);
    this.easing = parseInt(easing);
}

var Parser = function (pattern) {
    this.pattern = pattern;

    this.parse = function () {
        var fades = [];
        var fadesRaw = this.pattern.trim().split(";");
        $(fadesRaw).each(function () {
            var elements = this.split(",");
            if (elements.length < 3 || elements.length > 4) {
                return;
            }
            fades.push(new Fade(elements[0].trim(), 
                elements[1].trim(), 
                elements[2].trim(), 
                elements.length == 4 ? elements[3].trim() : 1))
        });

        return fades;
    }
}
