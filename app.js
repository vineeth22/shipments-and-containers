const express = require('express');
const main = require('./main');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));

app.get('/listContainers', async (req, res) => {
  let containers = await main.listContainers();
  res.send(containers);
});


app.post('/updateContainerStatus', async (req, res) => {
  let output = await main.updateContainerStatus(req.body.containerId, req.body.status);
  res.send(output);
});

app.get('/listShipments', async (req, res) => {
  let shipments = await main.listShipments();
  res.send(shipments);
});

app.post('/deleteShipment', async (req, res) => {
  let output = await main.deleteShipment(req.body.shipmentId);
  res.send(output);
});

app.post('/createShipment', async (req, res) => {
  let output = await main.createShipment(req.body.weight, req.body.volume);
  res.send(output);
});

app.listen(port, () => console.log(`App listening on port ${port}!`));
