const { MongoClient } = require('mongodb');
const assert = require('assert');
const { ObjectId } = require('mongodb');

const url = 'mongodb://localhost:27017';
const dbName = 'sac';


const addShipment = async (shipment) => {
  let client;
  let newShipment = Object.assign(shipment);
  try {
    client = await MongoClient.connect(url, { useNewUrlParser: true });
    console.log('Connected successfully to server');

    const db = client.db(dbName);
    let r = await db.collection('shipments').insertOne(shipment);
    assert.equal(1, r.insertedCount);
    newShipment._id = r.ops[0]._id;
  } catch (err) {
    console.log(err.stack);
  }
  client.close();
  return newShipment;
};

const assignContainer = async (shipment) => {
  let client;
  let container;
  try {
    client = await MongoClient.connect(url, { useNewUrlParser: true });
    console.log('Connected successfully to server');

    const db = client.db(dbName);
    let r = await db.collection('containers').findOneAndUpdate(
      {
        status: 'draft',
        volumeAvailable: { $gte: shipment.volume },
        weightAvailable: { $gte: shipment.weight }
      },
      {
        $push: { shipments: shipment._id },
        $inc: {
          volumeFilled: shipment.volume,
          weightFilled: shipment.weight,
          volumeAvailable: -(shipment.volume),
          weightAvailable: -(shipment.weight)
        },
      },
      {
        returnOriginal: false,
        sort: { volumeFilled: -1, weightFilled: -1 }
      }
    )
    container = r.value;
  } catch (err) {
    console.log(err.stack);
  }
  client.close();
  return container;
}

const createContainer = async () => {
  let client;
  let container = {
    status: 'draft',
    volumeLimit: 25000000,
    weightLimit: 3000,
    volumeFilled: 0,
    weightFilled: 0,
    volumeAvailable: 25000000,
    weightAvailable: 3000,
    shipments: [],
  };

  try {
    client = await MongoClient.connect(url, { useNewUrlParser: true });
    console.log('Connected successfully to server');

    const db = client.db(dbName);
    let r = await db.collection('containers').insertOne(container);
    assert.equal(1, r.insertedCount);
    container._id = r.ops[0]._id;
  } catch (err) {
    console.log(err.stack);
  }
  client.close();
  return container;
};

const updateShipmentContainer = async (shipment, container) => {
  let client;
  try {
    client = await MongoClient.connect(url, { useNewUrlParser: true });
    console.log("Connected successfully to server");

    const db = client.db(dbName);
    let r = await db.collection('shipments').updateOne({ _id: shipment._id }, { $set: { container: container._id } });
    assert.equal(1, r.matchedCount);
    assert.equal(1, r.modifiedCount);
  } catch (err) {
    console.log(err.stack);
  }
  client.close();
}

const createShipment = async (weight, volume) => {
  let shipment = {
    weight,
    volume,
  };
  let newShipment = await addShipment(shipment);
  let container = await assignContainer(newShipment);
  if (container === null) {
    await createContainer();
    container = await assignContainer(newShipment);
  }
  console.log(container);
  await updateShipmentContainer(newShipment, container);
}


const listShipments = async () => {
  let client;
  let shipments;
  try {
    client = await MongoClient.connect(url, { useNewUrlParser: true });
    console.log('Connected successfully to server');

    const db = client.db(dbName);
    shipments = await db.collection('shipments').find().toArray();
  } catch (err) {
    console.log(err.stack);
  }
  client.close();
  return shipments;
};

const listContainers = async () => {
  let client;
  let containers;
  try {
    client = await MongoClient.connect(url, { useNewUrlParser: true });
    console.log('Connected successfully to server');

    const db = client.db(dbName);
    containers = await db.collection('containers').find().toArray();
  } catch (err) {
    console.log(err.stack);
  }
  client.close();
  return containers;
};


const reshuffleShipments = async () => {
  let client;
  try {
    client = await MongoClient.connect(url, { useNewUrlParser: true });
    console.log("Connected successfully to server");

    const db = client.db(dbName);
    let r = await db.collection('containers').find({ status: 'draft' }).project({ shipments: 1 }).toArray();
    let shipmentIds = r.reduce((accumulator, currentValue) => {
      return [...accumulator, ...currentValue.shipments];
    }, []);
    r = await db.collection('containers').deleteMany({ status: 'draft' });
    let shipments = await db.collection('shipments').find({ _id: { $in: shipmentIds } }).sort({ volume: -1, weight: -1 }).toArray();
    for (shipment of shipments) {
      let container = await assignContainer(shipment);
      if (container === null) {
        await createContainer();
        container = await assignContainer(shipment);
      }
      await updateShipmentContainer(shipment, container);
    }
  } catch (err) {
    console.log(err.stack);
  }
  client.close();
}

const deleteShipment = async (shipmentId) => {
  let client;
  try {
    client = await MongoClient.connect(url, { useNewUrlParser: true });
    console.log("Connected successfully to server");
    const db = client.db(dbName);
    let r = await db.collection('shipments').find({ _id: ObjectId(shipmentId) }).project().toArray();
    let shipment = r[0];
    if (shipment === undefined) {
      console.log('Shipment not found');
      client.close();
      return;
    }
    console.log(shipment);

    r = await db.collection('containers').find({ shipments: ObjectId(shipmentId) }).toArray();
    let container = r[0];
    console.log(container);

    if (container !== undefined && container.status !== 'draft') {
      console.log('Shipment cannot be deleted');
      client.close();
      return;
    }

    r = await db.collection('shipments').deleteOne({ _id: shipment._id });
    assert.equal(1, r.deletedCount);

    r = await db.collection('containers').findOneAndUpdate(
      {
        _id: container._id,
      },
      {
        $pull: { shipments: shipment._id },
        $inc: {
          volumeFilled: -(shipment.volume),
          weightFilled: -(shipment.weight),
          volumeAvailable: shipment.volume,
          weightAvailable: shipment.weight
        },
      },
      {
        returnOriginal: false
      }
    );
    console.log(r);

  } catch (err) {
    console.log(err.stack);
  }
  client.close();
}

const updateContainerStatus = async (containerId, status) => {
  let client;
  try {
    client = await MongoClient.connect(url, { useNewUrlParser: true });
    console.log("Connected successfully to server");

    const db = client.db(dbName);

    r = await db.collection('containers').findOneAndUpdate(
      {
        _id: ObjectId(containerId),
      },
      {
        $set: { status: status },
      },
      {
        returnOriginal: false
      }
    );
      console.log(r);
  } catch (err) {
    console.log(err.stack);
  }
  client.close();
}
/* ****testing */

(
  async () => {
    await updateContainerStatus('5bd344b8433a3626581db832','transit');
  }
)();
//addShipment({ weight: 123, volume: 234 });
//createNewContainer();
//createShipment assignContainer

// (
//   async () => {
//     let output;
//     output = await deleteShipment('5bd34393d821e725dce49ecf');
//     console.log(output);
//     output = await listShipments();
//     console.log(output);
//     output = await listContainers();
//     console.log(output);
//   }
// )();

/*
  let client;
  try {
    client = await MongoClient.connect(url, { useNewUrlParser: true });
    console.log("Connected successfully to server");

    const db = client.db(dbName);
  } catch (err) {
    console.log(err.stack);
  }
  client.close();
*/

// addshipment -> assign container(find and update) -> updateshipmentcomtainer

/*
db.containers.aggregate(
  {
    $project: {
      volumeAvailable: { $subtract: ['$volumeLimit', '$volumeFilled'] },
      weightAvailable: { $subtract: ['$weightLimit', '$weightFilled'] }
    }
  },
  {
    $match: {
      volumeAvailable: { $gte: 5000 },
      weightAvailable: { $gte: 2000 },
    }
  },
  {
    $limit: 1
  }
)
*/
/*
db.containers.findOneAndUpdate(
  {
    volumeAvailable: { $gte: 5000 },
    weightAvailable: { $gte: 2000 },
  },
  { 
    $push: { shipments: 89 },
    $inc: {volumeFilled:100, weightFilled:100, volumeAvailable: -100, weightAvailable: -100},
 }

)

//implement weight volume bound check, container status check
*/