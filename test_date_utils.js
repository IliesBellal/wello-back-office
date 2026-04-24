function toUTCDateString(date) {
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function toUTCDateTimeString(date) {
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const seconds = String(d.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const date1 = new Date('2026-04-23T14:30:45Z');
const date2 = '2026-04-23';

console.log('Test 1: Date object (2026-04-23T14:30:45Z)');
console.log('toUTCDateString:', toUTCDateString(date1));
console.log('toUTCDateTimeString:', toUTCDateTimeString(date1));

console.log('\nTest 2: Date string (2026-04-23)');
console.log('toUTCDateString:', toUTCDateString(date2));
console.log('toUTCDateTimeString:', toUTCDateTimeString(date2));
