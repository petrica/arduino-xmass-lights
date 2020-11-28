#include <Arduino.h>
#include <main.h>

const uint8_t PIN_OUT = 3;

uint8_t *samples;
uint16_t no_samples;

// Debug messages get sent to the serial port.
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-parameter"
void debug(const char *str) {
#if DEBUG
  uint32_t now = millis();
  Serial.printf("%07u.%03u: %s\n", now / 1000, now % 1000, str);
#endif  // DEBUG
}
#pragma GCC diagnostic pop

void doRestart(const char* str, const bool serial_only) {
#if MQTT_ENABLE
  if (!serial_only)
    mqttLog(str);
  else
#endif  // MQTT_ENABLE
    debug(str);
  delay(2000);  // Enough time for messages to be sent.
//   ESP.restart();
  delay(5000);  // Enough time to ensure we don't return.
}

fade_t *newFadesArray(const uint16_t size) {
  fade_t *result;

  result = reinterpret_cast<fade_t*>(malloc(size * sizeof(fade_t)));
  // Check we malloc'ed successfully.
  if (result == NULL)  // malloc failed, so give up.
    doRestart(
        "FATAL: Can't allocate memory for an array for a new message! "
        "Forcing a reboot!", true);  // Send to serial only as we are in low mem
  return result;
}

uint8_t *newSamplesArray(const uint16_t size) {
  uint8_t *result;

  result = reinterpret_cast<uint8_t*>(malloc(size * sizeof(uint8_t)));
  // Check we malloc'ed successfully.
  if (result == NULL)  // malloc failed, so give up.
    doRestart(
        "FATAL: Can't allocate memory for an array for a new message! "
        "Forcing a reboot!", true);  // Send to serial only as we are in low mem
  return result;
}

void setup() {
    // put your setup code here, to run once:
    pinMode(PIN_OUT, OUTPUT);

    // Parser parser("0,0.5,100;0.5,1,30;0,0.5,100;0.5,1,30;0,0.5,100;0.5,1,30;0,0.5,100;0.5,1,30;0,0.5,100;0.5,1,30;0,0.5,100;0.5,1,30;0,1,500,1;1,0,1000,1");

    Parser parser("0,1,3000;1,1,3000;1,0,3000;0,0,1500");

    uint16_t no_fades = parser.getNoFades();
    fade_t *fades = newFadesArray(no_fades);
    parser.parse(fades);

    Sampler sampler(fades, no_fades, SAMPLE_RATE);

    no_samples = sampler.getNoSamples();
    samples = newSamplesArray(no_samples);
    sampler.sample(samples);
    
    free(fades);
}

void loop() { 
    for (int i = 0 ; i < no_samples; i++) {
        analogWrite(PIN_OUT, samples[i]);
        delay(10);
    }
}

uint16_t Parser::getNoFades() {
    int16_t index = -1;
    uint16_t count = 0;
    do {
        index = pattern_.indexOf(PATTERN_SEPARATOR, index + 1);
        count++;
    } while (index != -1);
    return count;
}

void Parser::parse(fade_t fades[]) {
    String tmp_str;

    uint16_t count = 0;
    uint16_t start_from = 0;
    int16_t index = -1;
    do {
        index = pattern_.indexOf(PATTERN_SEPARATOR, start_from);
        tmp_str = pattern_.substring(start_from, index);
        parseFade(tmp_str, fades[count]);
        start_from = index + 1;
        count++;
    } while (index != -1);
}

void Parser::parseFade(String pattern, fade_t &fade) {
    uint8_t count = 0;
    uint8_t start_from = 0;
    int16_t index = -1;

    String tmp_str;

    do {
        index = pattern.indexOf(PATTERN_VALUES_SEPARATOR, start_from);
        tmp_str = pattern.substring(start_from, index);

        switch (count) {
            case 0:
                    fade.v_start = static_cast<uint8_t>(tmp_str.toFloat() * 255);
                break;
            case 1:
                    fade.v_stop = static_cast<uint8_t>(tmp_str.toFloat() * 255);
                break;
            case 2:
                    fade.interval = static_cast<uint16_t>(tmp_str.toInt());
                break;
            case 3:
                    fade.easing = static_cast<uint8_t>(tmp_str.toInt());
                break;
        }

        start_from = index + 1;
        count++;
    } while (index != -1);

    // Add default easing
    if (count < 4) {
        fade.easing = EASING_DEFAULT;
    }
}

uint16_t Sampler::getNoSamples() {
    uint16_t count = 0;
    for (uint16_t i = 0; i < no_fades_; i++) {
        count += getNoSamplesFade(fades_[i]);
    }

    return count;
}

uint16_t Sampler::getNoSamplesFade(const fade_t &fade) {
    return round(((float)sample_rate_ / 1000) * fade.interval);
}

void Sampler::sample(uint8_t samples[]) {
    uint16_t count = 0;
    for (uint16_t i = 0; i < no_fades_; i++) {
        sampleFade(fades_[i], count, samples);
    }
}

void Sampler::sampleFade(const fade_t &fade, uint16_t &index, uint8_t samples[]) {
    uint16_t divs = getNoSamplesFade(fade);

    for (uint16_t i = 0; i < divs; i++) {
        float x = 0;
        if (i > 0) x = (float)i / (divs - 1);

        float val = 0;
        switch (fade.easing) {
            case 6:
                val = easeOutExpo(x);
                break;
            case 5:
                val = easeInExpo(x);
                break;
            case 4:
                val = easeOutQuart(x);
                break;
            case 3:
                val = easeInQuart(x);
                break;
            case 2:
                val = easeOutSine(x);
                break;
            case 1:
            default:
                val = easeInSine(x);

        }   

        samples[index] = round(val * (fade.v_stop - fade.v_start) + fade.v_start);

        index ++;
    }
}

float Sampler::easeInSine(float x) {
  return 1 - cos((x * PI) / 2);
}

float Sampler::easeOutSine(float x) {
  return sin((x * PI) / 2);
}

float Sampler::easeInQuart(float x) {
  return x * x * x * x;
}

float Sampler::easeOutQuart(float x) {
  return 1 - pow(1 - x, 4);
}

float Sampler::easeInExpo(float x) {
  return x == 0 ? 0 : pow(2, 10 * x - 10);
}

float Sampler::easeOutExpo(float x) {
  return x == 1 ? 1 : 1 - pow(2, -10 * x);
}