$(function () {
    var player = null;
    var sampleRate = 100;
    var chart = null;
    var samples = [];

    $('textarea').val(localStorage.getItem('pattern'));
    $('textarea').on('keyup', function (event) {
        var pattern = $('textarea').val();
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
        console.log(labels);
        chart.data.labels = labels;
        chart.data.datasets[0].data = samples;
        chart.update('none');
    });
    $('input#play').on('click', function (event) {
        event.preventDefault();

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
});

var Player = function(samples, sampleRate) {
    this.samples = samples;
    this.sampleRate = parseInt(sampleRate);
    this.body = $('.lightbulb');
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
        const from = [48, 48, 48];
        const to = [255, 255, 255];
        const r = from[0] + (to[0] - from[0]) / 255 * value;
        const g = from[1] + (to[1] - from[1]) / 255 * value;
        const b = from[2] + (to[2] - from[2]) / 255 * value;
        this.body.css('background-color', 'rgb(' + r + ',' + g + ',' + b + ')');
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