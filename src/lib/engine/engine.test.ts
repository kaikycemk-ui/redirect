import assert from 'assert';
import {
  selectRandom,
  selectByWeight,
  selectByRoundRobin,
  simulateDistribution,
} from './strategies';
import { hashIp, generateAnonymousSessionId, parseUserAgent, sanitizeRedirectUrl } from './tracking';

console.log('--- [TEST SUITE] LeadRouter Core Engine ---');

// 1. Testes de Estratégias
console.log('1. Testando Random Selection...');
const items = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
const randomPick = selectRandom(items);
assert(randomPick !== null && ['A', 'B', 'C'].includes(randomPick.id), 'Falha na seleção Random');
console.log('   ✓ Random funcionando perfeitamente.');

console.log('2. Testando Weighted Selection...');
const weightedItems = [
  { id: 'WA_1', weight: 80 },
  { id: 'WA_2', weight: 20 },
  { id: 'WA_3', weight: 0 },
];
const sim = simulateDistribution(weightedItems, 'weighted', 10000);
console.log(`   Resultados Weighted: WA_1=${sim.WA_1.percentage}%, WA_2=${sim.WA_2.percentage}%, WA_3=${sim.WA_3.percentage}%`);
assert(sim.WA_1.count > sim.WA_2.count * 2, 'WA_1 deveria receber muito mais tráfego que WA_2');
assert(sim.WA_3.count === 0, 'Item com peso 0 nunca deveria ser sorteado');
console.log('   ✓ Weighted funcionando perfeitamente.');

console.log('3. Testando Round Robin...');
const rrItems = [{ id: 'DEV_1' }, { id: 'DEV_2' }, { id: 'DEV_3' }];
let currentIdx = -1;

const step1 = selectByRoundRobin(rrItems, currentIdx)!;
assert(step1.item.id === 'DEV_1' && step1.nextIndex === 0, 'Falha passo 1 Round Robin');

const step2 = selectByRoundRobin(rrItems, step1.nextIndex)!;
assert(step2.item.id === 'DEV_2' && step2.nextIndex === 1, 'Falha passo 2 Round Robin');

const step3 = selectByRoundRobin(rrItems, step2.nextIndex)!;
assert(step3.item.id === 'DEV_3' && step3.nextIndex === 2, 'Falha passo 3 Round Robin');

const step4 = selectByRoundRobin(rrItems, step3.nextIndex)!;
assert(step4.item.id === 'DEV_1' && step4.nextIndex === 0, 'Falha no ciclo cíclico Round Robin');
console.log('   ✓ Round Robin funcionando perfeitamente.');

// 2. Testes de Sanitização e Tracking
console.log('4. Testando Sanitização de URLs...');
assert(sanitizeRedirectUrl('https://wa.me/5511999999999') === 'https://wa.me/5511999999999', 'Falha https válida');
assert(sanitizeRedirectUrl('http://meusite.com/landing') === 'http://meusite.com/landing', 'Falha http válida');
assert(sanitizeRedirectUrl('javascript:alert(1)') === null, 'Deveria bloquear links maliciosos javascript:');
assert(sanitizeRedirectUrl('data:text/html,...') === null, 'Deveria bloquear links data:');
console.log('   ✓ Validação estrita de URLs e proteção contra injeção OK.');

console.log('5. Testando Hashing Anônimo de IP e Sessão...');
const hash1 = hashIp('177.18.29.30');
const hash2 = hashIp('177.18.29.30');
const hash3 = hashIp('189.20.10.5');
assert(hash1 === hash2, 'Hashes do mesmo IP devem ser idênticos');
assert(hash1 !== hash3, 'Hashes de IPs diferentes devem ser distintos');
assert(!hash1.includes('177.18'), 'Hash não deve conter trecho do IP original');

const sess1 = generateAnonymousSessionId(hash1, 'Mozilla/5.0 iPhone');
assert(sess1.length === 32, 'Session ID MD5 anônimo gerado');
console.log('   ✓ Hash de IP e privacidade OK.');

console.log('6. Testando Parser de User-Agent...');
const mobileMeta = parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1');
assert(mobileMeta.deviceType === 'mobile', 'Deveria detectar iPhone como mobile');
assert(mobileMeta.os === 'iOS', 'Deveria detectar iOS');

const desktopMeta = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
assert(desktopMeta.deviceType === 'desktop', 'Deveria detectar Windows como desktop');
assert(desktopMeta.os === 'Windows', 'Deveria detectar Windows OS');
console.log('   ✓ Parser de User-Agent ultra-rápido OK.');

console.log('\n===========================================');
console.log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO! 🎉');
console.log('===========================================\n');
