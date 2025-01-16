from micropython import const
from machine import Pin, I2C
import time
import bluetooth

# Constants
MODE_VOLTAGE = const(0x00)
MODE_CURRENT = const(0x01)
MODE_POWER   = const(0x02)

# I2C Configuration
i2c1 = I2C(1, scl=Pin(15), sda=Pin(14), freq=100000)  # I2C1 for first INA219
##i2c0 = I2C(0, scl=Pin(9), sda=Pin(8), freq=100000)    # I2C0 for second INA219
print("I2C1 devices:", i2c1.scan())
##print("I2C0 devices:", i2c0.scan())

# INA219 Configuration
I2CADR1 = 0x40  # Address for first INA219 (current measurement)
I2CADR2 = 0x41  # Address for second INA219 (voltage measurement, on I2C0)
SHUNT_OHMS = 0.1
MAX_EXPECTED_AMPS = 0.2

# Initialize INA219 sensors
from INA219 import INA219  # Import after I2C configuration
meter_current = INA219(i2c1, I2CADR1, SHUNT_OHMS)  # First sensor on I2C1
##meter_voltage = INA219(i2c0, I2CADR2, SHUNT_OHMS)  # Second sensor on I2C0
meter_current.configure()
##meter_voltage.configure()

# Bluetooth Initialization
ble = bluetooth.BLE()
ble.active(True)

# Global Variables
current_mA = 0
voltage_1 = 0  # Voltage from the first INA219
voltage_2 = 0  # Voltage from the second INA219
startTime = time.ticks_ms()
mode = MODE_VOLTAGE

# BLE Advertising Data
def advertise():
    name = "Pico-BT"
    adv_data = bytearray(
        b'\x02\x01\x06' +  # Flags: LE General Discoverable Mode, BR/EDR Not Supported
        bytes([len(name) + 1, 0x09]) +  # Complete Local Name
        name.encode('utf-8')
    )
    ble.gap_advertise(100, adv_data)

advertise()

# Measurement Function
def measurement():
    global current_mA, voltage_1, voltage_2
    current_mA = meter_current.current()
    voltage_1 = meter_current.voltage()
    ##voltage_2 = meter_voltage.voltage()
    print("Sensor 1 - V={0:.2f}V, I={1:.2f}mA".format(voltage_1, current_mA))
    print("Sensor 2 - V={0:.2f}V".format(voltage_2))

# Send Meter Data via Bluetooth
def send_meter_data():
    s = ""
    if mode == MODE_VOLTAGE:
        s = "AT+V1={0:.2f}\r\n".format(voltage_1) ##temp, use below
    ##    s = "AT+V1={0:.2f}, V2={1:.2f}\r\n".format(voltage_1, voltage_2)
    elif mode == MODE_CURRENT:
        s = "AT+IMA={0:.2f}\r\n".format(current_mA)
    elif mode == MODE_POWER:
        s = "AT+V1_IMA={0:.2f},{1:.2f}\r\n".format(voltage_1, current_mA)
    ble.gatts_write(tx_handle, s.encode())

# Parse Commands
def parse_command(cmd):
    global mode
    print(cmd)
    if cmd == "AT+METER=0\r\n":
        mode = MODE_VOLTAGE
    elif cmd == "AT+METER=1\r\n":
        mode = MODE_CURRENT
    elif cmd == "AT+METER=2\r\n":
        mode = MODE_POWER

# BLE Callback
def on_rx(event, data):
    parse_command(data.decode('utf-8'))
    send_meter_data()

# BLE GATT Service
uuid_service = bluetooth.UUID(0x181A)  # Environmental sensing service
uuid_rx = bluetooth.UUID(0x2A1C)       # Characteristic for receiving commands
uuid_tx = bluetooth.UUID(0x2A1D)       # Characteristic for sending data

rx_char = (uuid_rx, bluetooth.FLAG_WRITE | bluetooth.FLAG_WRITE_NO_RESPONSE)
tx_char = (uuid_tx, bluetooth.FLAG_READ | bluetooth.FLAG_NOTIFY)

service = (uuid_service, (rx_char, tx_char))
handles = ble.gatts_register_services([service])  # Register service and get handles

# Get TX characteristic handle
tx_handle = handles[0][1]  # The second characteristic in the service (TX)

# Set buffer for TX characteristic
ble.gatts_set_buffer(tx_handle, 256, True)

# Main Loop
while True:
    currentTime = time.ticks_ms()
    if (currentTime - startTime) > 1000:  # Take measurements every second
        startTime = currentTime
        measurement()
        send_meter_data()
