# Simple demo of reading each analog input from the ADS1x15 and printing it to
# the screen.
# Author: Tony DiCola
# License: Public Domain
import time
import json
import paho.mqtt.client as mqtt
import ssl
# Import the ADS1x15 module.
import Adafruit_ADS1x15


# Create an ADS1115 ADC (16-bit) instance.
adc = Adafruit_ADS1x15.ADS1115()

# Or create an ADS1015 ADC (12-bit) instance.
#adc = Adafruit_ADS1x15.ADS1015()

# Note you can change the I2C address from its default (0x48), and/or the I2C
# bus by passing in these optional parameters:
#adc = Adafruit_ADS1x15.ADS1015(address=0x49, busnum=1)

def Average(lst): 
    return sum(lst) / len(lst) 

# Choose a gain of 1 for reading voltages from 0 to 4.09V.
# Or pick a different gain to change the range of voltages that are read:
#  - 2/3 = +/-6.144V
#  -   1 = +/-4.096V
#  -   2 = +/-2.048V
#  -   4 = +/-1.024V
#  -   8 = +/-0.512V
#  -  16 = +/-0.256V
# See table 3 in the ADS1015/ADS1115 datasheet for more info on gain.
GAIN = 16

#initialise MQTT
client = mqtt.Client()
client.tls_set(ca_certs="mosquitto.org.crt",certfile="client.crt",keyfile="client.key",tls_version=ssl.PROTOCOL_TLSv1_2)
client.connect("test.mosquitto.org",port=8884)

print('Reading ADS1x15 values to do calibration, press Ctrl-C to quit...')
values = []
label = []
client.userdata = [False, None]
SENSORID = 'SENSE001'
ROOT = 'IC.embedded/P/F/'

def on_message(client, userdata, message):
	if (message.topic == ROOT+SENSORID+'/getWeight'):
		client.userdata[1] = message.payload.decode('UTF-8')
		client.userdata[0] = True

client.on_message = on_message

true = True
while (true):
	weight = float(input("What's the weight? "))
	if(int(weight) <0):
		true = False
		break
	time.sleep(0.5)
	feature_list = []
	for j in range(10):
		feature_list.append(adc.read_adc_difference(0, gain=GAIN)) 
		time.sleep(0.2)
	values.append(Average(feature_list))
	label.append(weight)

slope = (label[1]-label[0])/(values[1] - values[0])
yint = label[0] - slope*values[0]

stop = False
while not stop:
	client.subscribe(ROOT+"#")
	client.loop_start()
	if client.userdata[0]:
		read = adc.read_adc_difference(0, gain=GAIN)
		predict = slope*read + yint
		output = json.dumps(predict)
		client.publish(ROOT+SENSORID+'/'+client.userdata[1]+"/giveWeight",output)
		client.userdata[0] = False
		print(read)
	print('waiting')
	time.sleep(2)
client.loop_stop()