#ifndef XMASS_LIGHTS_H_
#define XMASS_LIGHTS_H_

#ifndef DEBUG
#define DEBUG false  // Change to 'true' for serial debug output.
#endif

#ifndef PATTERN_SEPARATOR
#define PATTERN_SEPARATOR ";"
#endif

#ifndef PATTERN_VALUES_SEPARATOR
#define PATTERN_VALUES_SEPARATOR ","
#endif

#ifndef EASING_DEFAULT
#define EASING_DEFAULT 1
#endif

#ifndef SAMPLE_RATE
#define SAMPLE_RATE 100
#endif

#include <Arduino.h>

struct fade_t {
    uint8_t v_start;
    uint8_t v_stop;
    uint16_t interval;
    uint8_t easing;
};

class Parser {
    public:
        Parser(const String pattern):
            pattern_(pattern) {
        }

        uint16_t getNoFades(); 

        void parse(fade_t fades[]);
        
    private:
        const String pattern_;
        uint16_t no_fades_;

        void parseFade(String pattern, fade_t &fade);
};

class Sampler {
    public:
        Sampler(fade_t fades[], uint16_t no_fades, uint16_t sample_rate) :
            fades_(fades), no_fades_(no_fades), sample_rate_(sample_rate) {

        }

        uint16_t getNoSamples();
        void sample(uint8_t samples[]);

    private:
        const fade_t *fades_;
        const uint16_t no_fades_;
        const uint16_t sample_rate_;

        uint16_t getNoSamplesFade(const fade_t &fade);
        void sampleFade(const fade_t &fade, uint16_t &index, uint8_t samples[]);
        float easeInSine(float x);
        float easeOutSine(float x);
        float easeInQuart(float x);
        float easeOutQuart(float x);
        float easeInExpo(float x);
        float easeOutExpo(float x);
};

#endif