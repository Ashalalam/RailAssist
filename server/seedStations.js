import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Station from './models/Station.js';

dotenv.config();

// Comprehensive Indian Railway Stations Data
// Source: Indian Railways official station codes
const stations = [
  // Major Terminals & Central Stations
  { code: 'NDLS', name: 'New Delhi', zone: 'NR', division: 'Delhi', state: 'Delhi', stationType: 'TERMINUS' },
  { code: 'MMCT', name: 'Mumbai Central', zone: 'WR', division: 'Mumbai', state: 'Maharashtra', stationType: 'CENTRAL' },
  { code: 'CSMT', name: 'Chhatrapati Shivaji Maharaj Terminus', zone: 'CR', division: 'Mumbai', state: 'Maharashtra', stationType: 'TERMINUS' },
  { code: 'HWH', name: 'Howrah Junction', zone: 'ER', division: 'Howrah', state: 'West Bengal', stationType: 'JUNCTION' },
  { code: 'MAS', name: 'Chennai Central', zone: 'SR', division: 'Chennai', state: 'Tamil Nadu', stationType: 'CENTRAL' },
  { code: 'SBC', name: 'Krantivira Sangolli Rayanna Bengaluru', zone: 'SWR', division: 'Bengaluru', state: 'Karnataka', stationType: 'CENTRAL' },
  
  // Andhra Pradesh Stations
  { code: 'BZA', name: 'Vijayawada Junction', zone: 'SCR', division: 'Vijayawada', state: 'Andhra Pradesh', stationType: 'JUNCTION' },
  { code: 'VSKP', name: 'Visakhapatnam Junction', zone: 'ECoR', division: 'Waltair', state: 'Andhra Pradesh', stationType: 'JUNCTION' },
  { code: 'GNT', name: 'Guntur Junction', zone: 'SCR', division: 'Guntur', state: 'Andhra Pradesh', stationType: 'JUNCTION' },
  { code: 'RJY', name: 'Rajahmundry', zone: 'ECoR', division: 'Waltair', state: 'Andhra Pradesh', stationType: 'REGULAR' },
  { code: 'TUNI', name: 'Tuni', zone: 'ECoR', division: 'Waltair', state: 'Andhra Pradesh', stationType: 'REGULAR' },
  { code: 'NLR', name: 'Nellore', zone: 'SCR', division: 'Guntakal', state: 'Andhra Pradesh', stationType: 'JUNCTION' },
  { code: 'OGL', name: 'Ongole', zone: 'SCR', division: 'Guntur', state: 'Andhra Pradesh', stationType: 'REGULAR' },
  
  // Telangana Stations
  { code: 'SC', name: 'Secunderabad Junction', zone: 'SCR', division: 'Secunderabad', state: 'Telangana', stationType: 'JUNCTION' },
  { code: 'HYB', name: 'Hyderabad Deccan Nampally', zone: 'SCR', division: 'Hyderabad', state: 'Telangana', stationType: 'TERMINUS' },
  { code: 'KCG', name: 'Kacheguda', zone: 'SCR', division: 'Hyderabad', state: 'Telangana', stationType: 'TERMINUS' },
  { code: 'WL', name: 'Warangal', zone: 'SCR', division: 'Secunderabad', state: 'Telangana', stationType: 'JUNCTION' },
  { code: 'BPQ', name: 'Balharshah Junction', zone: 'SCR', division: 'Secunderabad', state: 'Telangana', stationType: 'JUNCTION' },
  
  // Maharashtra Stations
  { code: 'PUNE', name: 'Pune Junction', zone: 'CR', division: 'Pune', state: 'Maharashtra', stationType: 'JUNCTION' },
  { code: 'NGP', name: 'Nagpur', zone: 'CR', division: 'Nagpur', state: 'Maharashtra', stationType: 'JUNCTION' },
  { code: 'BSL', name: 'Bhusaval Junction', zone: 'CR', division: 'Bhusaval', state: 'Maharashtra', stationType: 'JUNCTION' },
  { code: 'KYN', name: 'Kalyan Junction', zone: 'CR', division: 'Mumbai', state: 'Maharashtra', stationType: 'JUNCTION' },
  { code: 'LTT', name: 'Lokmanya Tilak Terminus', zone: 'CR', division: 'Mumbai', state: 'Maharashtra', stationType: 'TERMINUS' },
  { code: 'TNA', name: 'Thane', zone: 'CR', division: 'Mumbai', state: 'Maharashtra', stationType: 'REGULAR' },
  { code: 'DR', name: 'Dadar', zone: 'CR', division: 'Mumbai', state: 'Maharashtra', stationType: 'CENTRAL' },
  { code: 'BDTS', name: 'Bandra Terminus', zone: 'WR', division: 'Mumbai', state: 'Maharashtra', stationType: 'TERMINUS' },
  
  // Gujarat Stations
  { code: 'ADI', name: 'Ahmedabad Junction', zone: 'WR', division: 'Ahmedabad', state: 'Gujarat', stationType: 'JUNCTION' },
  { code: 'ST', name: 'Surat', zone: 'WR', division: 'Vadodara', state: 'Gujarat', stationType: 'REGULAR' },
  { code: 'BRC', name: 'Vadodara Junction', zone: 'WR', division: 'Vadodara', state: 'Gujarat', stationType: 'JUNCTION' },
  { code: 'RJT', name: 'Rajkot Junction', zone: 'WR', division: 'Rajkot', state: 'Gujarat', stationType: 'JUNCTION' },
  { code: 'GIMB', name: 'Gandhidham Junction', zone: 'WR', division: 'Bhavnagar', state: 'Gujarat', stationType: 'JUNCTION' },
  
  // Rajasthan Stations
  { code: 'JP', name: 'Jaipur Junction', zone: 'NWR', division: 'Jaipur', state: 'Rajasthan', stationType: 'JUNCTION' },
  { code: 'JU', name: 'Jodhpur Junction', zone: 'NWR', division: 'Jodhpur', state: 'Rajasthan', stationType: 'JUNCTION' },
  { code: 'UDZ', name: 'Udaipur City', zone: 'NWR', division: 'Ajmer', state: 'Rajasthan', stationType: 'REGULAR' },
  { code: 'AII', name: 'Ajmer Junction', zone: 'NWR', division: 'Ajmer', state: 'Rajasthan', stationType: 'JUNCTION' },
  { code: 'KOTA', name: 'Kota Junction', zone: 'WCR', division: 'Kota', state: 'Rajasthan', stationType: 'JUNCTION' },
  
  // Delhi & NCR Stations
  { code: 'DLI', name: 'Old Delhi Junction', zone: 'NR', division: 'Delhi', state: 'Delhi', stationType: 'JUNCTION' },
  { code: 'NZM', name: 'Hazrat Nizamuddin', zone: 'NR', division: 'Delhi', state: 'Delhi', stationType: 'TERMINUS' },
  { code: 'ANVT', name: 'Anand Vihar Terminal', zone: 'NR', division: 'Delhi', state: 'Delhi', stationType: 'TERMINUS' },
  { code: 'DSA', name: 'Delhi Sarai Rohilla', zone: 'NR', division: 'Delhi', state: 'Delhi', stationType: 'REGULAR' },
  { code: 'GZB', name: 'Ghaziabad Junction', zone: 'NR', division: 'Moradabad', state: 'Uttar Pradesh', stationType: 'JUNCTION' },
  
  // Uttar Pradesh Stations
  { code: 'LKO', name: 'Lucknow Charbagh NR', zone: 'NR', division: 'Lucknow', state: 'Uttar Pradesh', stationType: 'REGULAR' },
  { code: 'RKMP', name: 'Rani Kamalapati Bhopal', zone: 'WCR', division: 'Bhopal', state: 'Madhya Pradesh', stationType: 'JUNCTION' },
  { code: 'CNB', name: 'Kanpur Central', zone: 'NCR', division: 'Allahabad', state: 'Uttar Pradesh', stationType: 'CENTRAL' },
  { code: 'ALD', name: 'Allahabad Junction', zone: 'NCR', division: 'Allahabad', state: 'Uttar Pradesh', stationType: 'JUNCTION' },
  { code: 'AGC', name: 'Agra Cantt', zone: 'NCR', division: 'Agra', state: 'Uttar Pradesh', stationType: 'REGULAR' },
  { code: 'GKP', name: 'Gorakhpur Junction', zone: 'NER', division: 'Varanasi', state: 'Uttar Pradesh', stationType: 'JUNCTION' },
  { code: 'BSB', name: 'Varanasi Junction', zone: 'NER', division: 'Varanasi', state: 'Uttar Pradesh', stationType: 'JUNCTION' },
  
  // West Bengal Stations
  { code: 'SDAH', name: 'Sealdah', zone: 'ER', division: 'Sealdah', state: 'West Bengal', stationType: 'TERMINUS' },
  { code: 'KOAA', name: 'Kolkata', zone: 'SER', division: 'Kharagpur', state: 'West Bengal', stationType: 'REGULAR' },
  { code: 'ASN', name: 'Asansol Junction', zone: 'ER', division: 'Asansol', state: 'West Bengal', stationType: 'JUNCTION' },
  
  // Tamil Nadu Stations
  { code: 'MDU', name: 'Madurai Junction', zone: 'SR', division: 'Madurai', state: 'Tamil Nadu', stationType: 'JUNCTION' },
  { code: 'CBE', name: 'Coimbatore Junction', zone: 'SR', division: 'Salem', state: 'Tamil Nadu', stationType: 'JUNCTION' },
  { code: 'TPJ', name: 'Tiruchchirappalli Junction', zone: 'SR', division: 'Tiruchirappalli', state: 'Tamil Nadu', stationType: 'JUNCTION' },
  { code: 'SA', name: 'Salem Junction', zone: 'SR', division: 'Salem', state: 'Tamil Nadu', stationType: 'JUNCTION' },
  { code: 'TEN', name: 'Tirunelveli Junction', zone: 'SR', division: 'Madurai', state: 'Tamil Nadu', stationType: 'JUNCTION' },
  
  // Kerala Stations
  { code: 'TVC', name: 'Thiruvananthapuram Central', zone: 'SR', division: 'Thiruvananthapuram', state: 'Kerala', stationType: 'CENTRAL' },
  { code: 'ERS', name: 'Ernakulam Junction', zone: 'SR', division: 'Palakkad', state: 'Kerala', stationType: 'JUNCTION' },
  { code: 'CLT', name: 'Kozhikode', zone: 'SR', division: 'Palakkad', state: 'Kerala', stationType: 'REGULAR' },
  { code: 'CAN', name: 'Kannur', zone: 'SR', division: 'Palakkad', state: 'Kerala', stationType: 'REGULAR' },
  
  // Karnataka Stations
  { code: 'YPR', name: 'Yesvantpur Junction', zone: 'SWR', division: 'Bengaluru', state: 'Karnataka', stationType: 'JUNCTION' },
  { code: 'UBL', name: 'Hubballi Junction', zone: 'SWR', division: 'Hubballi', state: 'Karnataka', stationType: 'JUNCTION' },
  { code: 'MYS', name: 'Mysuru Junction', zone: 'SWR', division: 'Mysuru', state: 'Karnataka', stationType: 'JUNCTION' },
  
  // Bihar & Jharkhand Stations
  { code: 'PNBE', name: 'Patna Junction', zone: 'ECR', division: 'Danapur', state: 'Bihar', stationType: 'JUNCTION' },
  { code: 'DNR', name: 'Danapur', zone: 'ECR', division: 'Danapur', state: 'Bihar', stationType: 'REGULAR' },
  { code: 'GAYA', name: 'Gaya Junction', zone: 'ECR', division: 'Gaya', state: 'Bihar', stationType: 'JUNCTION' },
  { code: 'DHN', name: 'Dhanbad Junction', zone: 'ECR', division: 'Dhanbad', state: 'Jharkhand', stationType: 'JUNCTION' },
  { code: 'RNC', name: 'Ranchi Junction', zone: 'SER', division: 'Ranchi', state: 'Jharkhand', stationType: 'JUNCTION' },
  
  // Punjab & Haryana Stations
  { code: 'ASR', name: 'Amritsar Junction', zone: 'NR', division: 'Firozpur', state: 'Punjab', stationType: 'JUNCTION' },
  { code: 'JUC', name: 'Jalandhar City', zone: 'NR', division: 'Firozpur', state: 'Punjab', stationType: 'REGULAR' },
  { code: 'LDH', name: 'Ludhiana Junction', zone: 'NR', division: 'Firozpur', state: 'Punjab', stationType: 'JUNCTION' },
  { code: 'UMB', name: 'Ambala Cantt Junction', zone: 'NR', division: 'Ambala', state: 'Haryana', stationType: 'JUNCTION' },
  { code: 'CDG', name: 'Chandigarh', zone: 'NR', division: 'Ambala', state: 'Chandigarh', stationType: 'TERMINUS' },
  
  // Odisha Stations
  { code: 'BBS', name: 'Bhubaneswar', zone: 'ECoR', division: 'Khurda Road', state: 'Odisha', stationType: 'REGULAR' },
  { code: 'PURI', name: 'Puri', zone: 'ECoR', division: 'Khurda Road', state: 'Odisha', stationType: 'TERMINUS' },
  { code: 'CTC', name: 'Cuttack', zone: 'ECoR', division: 'Khurda Road', state: 'Odisha', stationType: 'REGULAR' },
  { code: 'SML', name: 'Sambalpur Junction', zone: 'ECoR', division: 'Sambalpur', state: 'Odisha', stationType: 'JUNCTION' },
  
  // Madhya Pradesh Stations
  { code: 'BPL', name: 'Bhopal Junction', zone: 'WCR', division: 'Bhopal', state: 'Madhya Pradesh', stationType: 'JUNCTION' },
  { code: 'JBP', name: 'Jabalpur Junction', zone: 'WCR', division: 'Jabalpur', state: 'Madhya Pradesh', stationType: 'JUNCTION' },
  { code: 'ITR', name: 'Itarsi Junction', zone: 'WCR', division: 'Bhopal', state: 'Madhya Pradesh', stationType: 'JUNCTION' },
  { code: 'GWL', name: 'Gwalior Junction', zone: 'NCR', division: 'Agra', state: 'Madhya Pradesh', stationType: 'JUNCTION' },
  
  // Goa Stations
  { code: 'MAO', name: 'Madgaon Junction', zone: 'SWR', division: 'Hubballi', state: 'Goa', stationType: 'JUNCTION' },
  { code: 'KRMI', name: 'Karmali', zone: 'SWR', division: 'Hubballi', state: 'Goa', stationType: 'REGULAR' },
  
  // Chhattisgarh Stations
  { code: 'R', name: 'Raipur Junction', zone: 'SECR', division: 'Raipur', state: 'Chhattisgarh', stationType: 'JUNCTION' },
  { code: 'BSP', name: 'Bilaspur Junction', zone: 'SECR', division: 'Bilaspur', state: 'Chhattisgarh', stationType: 'JUNCTION' },
  
  // Uttarakhand Stations
  { code: 'DDN', name: 'Dehradun', zone: 'NR', division: 'Moradabad', state: 'Uttarakhand', stationType: 'TERMINUS' },
  { code: 'HW', name: 'Haridwar Junction', zone: 'NR', division: 'Moradabad', state: 'Uttarakhand', stationType: 'JUNCTION' },
  
  // Jammu & Kashmir Stations
  { code: 'JAT', name: 'Jammu Tawi', zone: 'NR', division: 'Firozpur', state: 'Jammu and Kashmir', stationType: 'TERMINUS' },
  { code: 'UHP', name: 'Udhampur', zone: 'NR', division: 'Firozpur', state: 'Jammu and Kashmir', stationType: 'REGULAR' },
  
  // Northeast Stations
  { code: 'GHY', name: 'Guwahati', zone: 'NFR', division: 'Lumding', state: 'Assam', stationType: 'REGULAR' },
  { code: 'DBRG', name: 'Dibrugarh Town', zone: 'NFR', division: 'Tinsukia', state: 'Assam', stationType: 'REGULAR' },
  
  // Additional Important Junctions
  { code: 'KGP', name: 'Kharagpur Junction', zone: 'SER', division: 'Kharagpur', state: 'West Bengal', stationType: 'JUNCTION' },
  { code: 'TATA', name: 'Tatanagar Junction', zone: 'SER', division: 'Chakradharpur', state: 'Jharkhand', stationType: 'JUNCTION' },
  { code: 'ROU', name: 'Rourkela Junction', zone: 'SER', division: 'Chakradharpur', state: 'Odisha', stationType: 'JUNCTION' },
  { code: 'BNC', name: 'Bengaluru Cantt', zone: 'SWR', division: 'Bengaluru', state: 'Karnataka', stationType: 'REGULAR' },
];

const seedStations = async () => {
  try {
    await connectDB();

    // Check if stations already exist
    const count = await Station.countDocuments();
    if (count > 0) {
      console.log(`${count} stations already exist in database. Skipping seed.`);
      console.log('To reseed, manually delete stations collection first.');
      process.exit(0);
    }

    // Insert stations
    const result = await Station.insertMany(stations);
    console.log(`✅ Successfully seeded ${result.length} railway stations.`);
    
    // Display sample stations
    console.log('\nSample stations:');
    console.log('  - BZA: Vijayawada Junction');
    console.log('  - NDLS: New Delhi');
    console.log('  - MMCT: Mumbai Central');
    console.log('  - HWH: Howrah Junction');
    console.log('  - MAS: Chennai Central');
    console.log('  - SBC: Bengaluru');
    console.log(`\nTotal: ${result.length} stations across all zones.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding stations:', error);
    process.exit(1);
  }
};

seedStations();
