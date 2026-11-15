// Nothing earbud packet framing.
// Protocol details referenced from ear-web (github.com/radiance-project/ear-web).
//
// Frame layout:
//   [0]    0x55 start byte
//   [1..2] flags (0x60 0x01 when sending)
//   [3..4] command, little-endian uint16
//   [5]    payload length
//   [6]    reserved
//   [7]    operation id
//   [8..]  payload
//   [..+2] CRC16 (Modbus), little-endian

const START_BYTE = 0x55;
const HEADER_LENGTH = 8;
const CRC_LENGTH = 2;

function crc16(bytes) {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
    }
  }
  return crc;
}

function encodeFrame(command, payload = [], operationId = 0) {
  const body = Buffer.from([
    START_BYTE, 0x60, 0x01,
    command & 0xff, (command >> 8) & 0xff,
    payload.length, 0x00, operationId & 0xff,
    ...payload,
  ]);
  const crc = crc16(body);
  return Buffer.concat([body, Buffer.from([crc & 0xff, crc >> 8])]);
}

// Turns an arbitrary byte stream into frames: { command, operationId, payload }.
class FrameParser {
  constructor() {
    this.buffer = Buffer.alloc(0);
  }

  push(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const frames = [];

    for (;;) {
      const start = this.buffer.indexOf(START_BYTE);
      if (start === -1) {
        this.buffer = Buffer.alloc(0);
        break;
      }
      if (start > 0) this.buffer = this.buffer.subarray(start);
      if (this.buffer.length < HEADER_LENGTH) break;

      const bodyLength = HEADER_LENGTH + this.buffer[5];
      if (this.buffer.length < bodyLength) break;

      const body = this.buffer.subarray(0, bodyLength);
      let frameLength = bodyLength;
      if (this.buffer.length >= bodyLength + CRC_LENGTH) {
        const crc = this.buffer[bodyLength] | (this.buffer[bodyLength + 1] << 8);
        if (crc === crc16(body)) frameLength += CRC_LENGTH;
      }

      frames.push({
        command: body.readUInt16LE(3),
        operationId: body[7],
        payload: Buffer.from(body.subarray(HEADER_LENGTH)),
      });
      this.buffer = this.buffer.subarray(frameLength);
    }

    return frames;
  }

  reset() {
    this.buffer = Buffer.alloc(0);
  }
}

module.exports = { crc16, encodeFrame, FrameParser };
