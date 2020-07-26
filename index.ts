import * as BlueLinky from "bluelinky";
import * as asyncMqtt from "async-mqtt";
import * as dotenv from 'dotenv';

dotenv.config();

let bluelinkClient: any;
let mqttClient: any;
try {
  bluelinkClient = new (BlueLinky as any)({
    username: process.env.BL_USERNAME,
    password: process.env.BL_PASSWORD,
    region: process.env.BL_REGION,
    pin: process.env.BL_PIN,
  });

  mqttClient = asyncMqtt.connect(process.env.MQTT_BROKER);

  bluelinkClient.on("ready", async () => {
    const vehicle = bluelinkClient.getVehicle(process.env.BL_VIN);

    const status = await vehicle.status({ parsed: false, refresh: true });

    await mqttClient.publish(
      "kona/status",
      JSON.stringify({
        battery: status.evStatus.batteryStatus,
        charging: status.evStatus.batteryCharge,
        'battery-12v': status.battery.batSoc,
        range: status.evStatus.reservChargeInfos.targetSOClist[0].dte.rangeByFuel.totalAvailableRange.value,
        locked: status.doorLock
      })
    );

    const location = await vehicle.location();

    await mqttClient.publish(
      "kona/location",
      JSON.stringify({
        longitude: location.longitude,
        latitude: location.latitude,
      })
    );

    mqttClient.end()
  });
} catch (err) {
  console.error("Caught exception", err);
}
