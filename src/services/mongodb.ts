import Realm from 'realm';
import { TestDocument } from '../config/realm';

// Initialize Realm with sync configuration
export const initRealmWithSync = async () => {
  try {
    const realm = await Realm.open({
      schema: [TestDocument],
      sync: {
        flexible: true,
        initialSubscriptions: {
          update: (mutableSubs, realm) => {
            mutableSubs.add(realm.objects('TestDocument'));
          },
        },
      },
    });

    console.log('Realm initialized with sync');
    return realm;
  } catch (error) {
    console.error('Error initializing Realm with sync:', error);
    throw error;
  }
};

// Sync function to ensure data is synchronized
export const syncWithMongoDB = async (realm: Realm) => {
  try {
    // Wait for sync to complete
    await realm.syncSession?.uploadAllLocalChanges();
    await realm.syncSession?.downloadAllServerChanges();
    console.log('Sync completed successfully');
  } catch (error) {
    console.error('Error syncing with MongoDB:', error);
    throw error;
  }
};

// Helper function to get Realm instance
let realmInstance: Realm | null = null;

export const getRealm = async () => {
  if (!realmInstance) {
    realmInstance = await initRealmWithSync();
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