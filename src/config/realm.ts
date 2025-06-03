import Realm from 'realm';

// Define your schema for userLocation
export class UserLocation extends Realm.Object {
  _id!: Realm.BSON.ObjectId;
  message!: string;
  timestamp!: Date;
  latitude!: number;
  longitude!: number;
  accuracy!: number;

  static schema = {
    name: 'userLocation', // must match collection name exactly (case-sensitive)
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      message: 'string',
      timestamp: 'date',
      latitude: 'double',
      longitude: 'double',
      accuracy: 'double',
    },
  };
}

export class HouseHuntingRoute extends Realm.Object {
  static schema = {
    name: 'HouseHuntingRoute',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      coordinates: { type: 'list', objectType: 'Coordinate' },
      timestamp: 'date',
    },
  };
}

export class Coordinate extends Realm.Object {
  latitude!: number;
  longitude!: number;

  static schema = {
    name: 'Coordinate',
    embedded: true,
    properties: {
      latitude: 'double',
      longitude: 'double',
    },
  };
}

export class HouseHuntingMarker extends Realm.Object {
  static schema = {
    name: 'HouseHuntingMarker',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      latitude: 'double',
      longitude: 'double',
      timestamp: 'date',
    },
  };
}

// Initialize Realm
export const initRealm = async () => {
  try {
    const realm = await Realm.open({
      schema: [UserLocation, HouseHuntingRoute, Coordinate, HouseHuntingMarker], // Use UserLocation schema
      schemaVersion: 2, // Incremented schema version
      deleteRealmIfMigrationNeeded: true, // For development only
    });

    console.log('Realm initialized successfully');
    return realm;
  } catch (error) {
    console.error('Error initializing Realm:', error);
    throw error;
  }
};

// Helper function to get Realm instance
let realmInstance: Realm | null = null;

export const getRealm = async () => {
  if (!realmInstance) {
    realmInstance = await initRealm();
  }
  return realmInstance;
};

// Helper function to close Realm
export const closeRealm = async () => {
  if (realmInstance) {
    realmInstance.close();
    realmInstance = null;
  }
}; 