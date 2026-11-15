// nx-bridge: a tiny Bluetooth transport for Nothing X Mac.
//
// Finds a connected, paired earbud that exposes the Nothing control service,
// opens an RFCOMM channel to it, and relays raw bytes over stdio as JSON lines.
// It knows nothing about the earbud protocol itself; that lives in src/device/.
//
// stdout events:  {"type":"connected","name":"…","address":"…"}
//                 {"type":"data","hex":"55…"}
//                 {"type":"disconnected"}
//                 {"type":"log","message":"…"}
// stdin commands: {"type":"write","hex":"55…"}

import Foundation
import IOBluetooth

// Nothing / CMF control service (SPP over RFCOMM).
let serviceUUIDBytes: [UInt8] = [
    0xAE, 0xAC, 0x4A, 0x03, 0xDF, 0xF5, 0x49, 0x8F,
    0x84, 0x3A, 0x34, 0x48, 0x7C, 0xF1, 0x33, 0xEB,
]
let scanInterval: TimeInterval = 3

func emit(_ object: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: object) else { return }
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write("\n".data(using: .utf8)!)
}

func log(_ message: String) { emit(["type": "log", "message": message]) }

func hexString(_ bytes: UnsafeBufferPointer<UInt8>) -> String {
    bytes.map { String(format: "%02x", $0) }.joined()
}

func bytes(fromHex hex: String) -> [UInt8]? {
    guard hex.count % 2 == 0 else { return nil }
    var out = [UInt8]()
    out.reserveCapacity(hex.count / 2)
    var index = hex.startIndex
    while index < hex.endIndex {
        let next = hex.index(index, offsetBy: 2)
        guard let byte = UInt8(hex[index..<next], radix: 16) else { return nil }
        out.append(byte)
        index = next
    }
    return out
}

final class Bridge: NSObject, IOBluetoothRFCOMMChannelDelegate {
    private var channel: IOBluetoothRFCOMMChannel?
    private var device: IOBluetoothDevice?
    private var sdpRequested = Set<String>()
    private let serviceUUID = IOBluetoothSDPUUID(bytes: serviceUUIDBytes, length: 16)

    func start() {
        scan()
        Timer.scheduledTimer(withTimeInterval: scanInterval, repeats: true) { [weak self] _ in
            self?.scan()
        }
    }

    // Look for a connected paired device that offers the control service.
    private func scan() {
        guard channel == nil else { return }
        guard let paired = IOBluetoothDevice.pairedDevices() as? [IOBluetoothDevice] else { return }

        for candidate in paired where candidate.isConnected() {
            guard let record = candidate.getServiceRecord(for: serviceUUID) else {
                // Service list not cached yet: ask once, pick it up on a later scan.
                let address = candidate.addressString ?? ""
                if !sdpRequested.contains(address) {
                    sdpRequested.insert(address)
                    candidate.performSDPQuery(nil)
                }
                continue
            }

            var channelID: BluetoothRFCOMMChannelID = 0
            guard record.getRFCOMMChannelID(&channelID) == kIOReturnSuccess else { continue }

            var opened: IOBluetoothRFCOMMChannel?
            let status = candidate.openRFCOMMChannelSync(&opened, withChannelID: channelID, delegate: self)
            guard status == kIOReturnSuccess, let opened else {
                log("Could not open channel to \(candidate.nameOrAddress ?? "device") (\(status))")
                continue
            }

            channel = opened
            device = candidate
            emit([
                "type": "connected",
                "name": candidate.name ?? candidate.nameOrAddress ?? "Earbuds",
                "address": candidate.addressString ?? "",
            ])
            return
        }
    }

    func write(hex: String) {
        guard let channel, var data = bytes(fromHex: hex), !data.isEmpty else { return }
        let status = data.withUnsafeMutableBytes { buffer in
            channel.writeSync(buffer.baseAddress, length: UInt16(buffer.count))
        }
        if status != kIOReturnSuccess { log("Write failed (\(status))") }
    }

    // MARK: IOBluetoothRFCOMMChannelDelegate

    func rfcommChannelData(_ rfcommChannel: IOBluetoothRFCOMMChannel!,
                           data dataPointer: UnsafeMutableRawPointer!,
                           length dataLength: Int) {
        let buffer = UnsafeBufferPointer(start: dataPointer.assumingMemoryBound(to: UInt8.self),
                                         count: dataLength)
        emit(["type": "data", "hex": hexString(buffer)])
    }

    func rfcommChannelClosed(_ rfcommChannel: IOBluetoothRFCOMMChannel!) {
        guard rfcommChannel === channel else { return }
        channel = nil
        device = nil
        emit(["type": "disconnected"])
    }
}

let bridge = Bridge()

// Read commands from stdin; quit when the parent app goes away (EOF).
FileHandle.standardInput.readabilityHandler = { handle in
    let chunk = handle.availableData
    if chunk.isEmpty { exit(0) }
    guard let text = String(data: chunk, encoding: .utf8) else { return }
    for line in text.split(separator: "\n") {
        guard
            let json = try? JSONSerialization.jsonObject(with: Data(line.utf8)) as? [String: Any],
            json["type"] as? String == "write",
            let hex = json["hex"] as? String
        else { continue }
        DispatchQueue.main.async { bridge.write(hex: hex) }
    }
}

bridge.start()
RunLoop.main.run()
