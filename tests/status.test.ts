import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateMeasurement, evaluateParameterStatus } from '@/lib/status';

test('evaluateParameterStatus aplica severidade específica para cloro baixo crítico', () => {
  const result = evaluateParameterStatus('chlorine', 0.1, 1, 3);

  assert.equal(result.status, 'CRITICAL');
  assert.equal(result.deviationDirection, 'LOW');
  assert.ok(result.recommendedAction?.includes('cloração corretiva'));
});

test('evaluateMeasurement mantém status NORMAL sem temperatura quando monitoramento desativado', () => {
  const result = evaluateMeasurement({
    tracksTemperature: false,
    idealChlorineMin: 1,
    idealChlorineMax: 3,
    idealPhMin: 7.2,
    idealPhMax: 7.8,
    idealAlkalinityMin: 80,
    idealAlkalinityMax: 120,
    idealHardnessMin: 200,
    idealHardnessMax: 400,
    idealTemperatureMin: null,
    idealTemperatureMax: null
  }, {
    chlorine: 2,
    ph: 7.4,
    alkalinity: 100,
    hardness: 250,
    temperature: null
  });

  assert.equal(result.overallStatus, 'NORMAL');
  assert.equal(result.parameters.temperature.status, 'NORMAL');
});

test('evaluateMeasurement retorna ATTENTION para pH levemente acima', () => {
  const result = evaluateMeasurement({
    tracksTemperature: true,
    idealChlorineMin: 1,
    idealChlorineMax: 3,
    idealPhMin: 7.2,
    idealPhMax: 7.8,
    idealAlkalinityMin: 80,
    idealAlkalinityMax: 120,
    idealHardnessMin: 200,
    idealHardnessMax: 400,
    idealTemperatureMin: 24,
    idealTemperatureMax: 30
  }, {
    chlorine: 2,
    ph: 7.9,
    alkalinity: 100,
    hardness: 250,
    temperature: 27
  });

  assert.equal(result.parameters.ph.status, 'ATTENTION');
  assert.equal(result.overallStatus, 'ATTENTION');
  assert.ok(result.recommendations.some(item => item.includes('pH')));
});
