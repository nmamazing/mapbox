import { getRealm } from '../config/realm';
import Realm from 'realm';

export async function testRealmWrite() {
  try {
    console.log('Testing Realm write...');
    const realm = await getRealm();
    
    // Write a test document
    realm.write(() => {
      realm.create('userLocation', {
        _id: new Realm.BSON.ObjectId(),
        message: 'Test write',
        timestamp: new Date(),
      });
    });

    console.log('Write successful!');
    return true;
  } catch (error) {
    console.error('Error writing to Realm:', error);
    return false;
  }
}

export async function testRealmRead() {
  try {
    console.log('Testing Realm read...');
    const realm = await getRealm();
    
    // Read all userLocation documents
    const documents = realm.objects('userLocation');
    console.log(`Read ${documents.length} documents from Realm!`);
    
    // Log the documents
    documents.forEach((doc: any, index: number) => {
      console.log(`Document ${index + 1}:`, {
        id: doc._id.toString(),
        message: doc.message,
        timestamp: doc.timestamp,
      });
    });

    return true;
  } catch (error) {
    console.error('Error reading from Realm:', error);
    return false;
  }
}

export async function testRealmDelete() {
  try {
    console.log('Testing Realm delete...');
    const realm = await getRealm();
    
    // Delete all userLocation documents
    realm.write(() => {
      const documents = realm.objects('userLocation');
      realm.delete(documents);
    });

    console.log('Delete successful!');
    return true;
  } catch (error) {
    console.error('Error deleting from Realm:', error);
    return false;
  }
} 