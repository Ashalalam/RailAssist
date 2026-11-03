import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Train from './models/Train.js';
import Division from './models/Division.js';
import AllowanceRule from './models/AllowanceRule.js';
import User from './models/User.js';
import Journey from './models/Journey.js';

dotenv.config();

const trains = [
  { number: '12951', name: 'Mumbai Rajdhani Express', fromStation: 'MMCT', toStation: 'NDLS', distanceKm: 1386 },
  { number: '12001', name: 'Bhopal Shatabdi Express', fromStation: 'RKMP', toStation: 'NDLS', distanceKm: 701 },
  { number: '12301', name: 'Howrah Rajdhani Express', fromStation: 'HWH', toStation: 'NDLS', distanceKm: 1445 },
  { number: '12626', name: 'Kerala Express', fromStation: 'NDLS', toStation: 'TVC', distanceKm: 3036 },
  { number: '11020', name: 'Konark Express', fromStation: 'BBS', toStation: 'CSMT', distanceKm: 1512 },
  { number: '12925', name: 'Paschim Express', fromStation: 'BDTS', toStation: 'ASR', distanceKm: 1675 },
  { number: '12260', name: 'Sealdah Duronto Express', fromStation: 'NDLS', toStation: 'SDAH', distanceKm: 1452 },
  { number: '12059', name: 'Kota Jan Shatabdi Express', fromStation: 'KOTA', toStation: 'NZM', distanceKm: 458 },
];

const divisions = [
  { code: 'BCT', name: 'Mumbai WR' },
  { code: 'BB', name: 'Mumbai CR' },
  { code: 'DLI', name: 'Delhi' },
  { code: 'HWH', name: 'Howrah' },
  { code: 'MAS', name: 'Chennai' },
  { code: 'SBC', name: 'Bengaluru' },
];

const allowanceRules = [
  { role: 'TTE', taDailyRate: 800, ndaHourlyRate: 180 },
  { role: 'TC', taDailyRate: 700, ndaHourlyRate: 160 },
  { role: 'Guard', taDailyRate: 900, ndaHourlyRate: 200 },
  { role: 'Loco Pilot', taDailyRate: 1000, ndaHourlyRate: 220 },
  { role: 'Assistant Loco Pilot', taDailyRate: 750, ndaHourlyRate: 170 },
  { role: 'Station Master', taDailyRate: 850, ndaHourlyRate: 190 },
  { role: 'Commercial Inspector', taDailyRate: 950, ndaHourlyRate: 210 },
  { role: 'Chief Ticket Inspector', taDailyRate: 1000, ndaHourlyRate: 220 },
  { role: 'Railway Supervisor', taDailyRate: 1100, ndaHourlyRate: 240 },
];

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Train.deleteMany();
    await Division.deleteMany();
    await AllowanceRule.deleteMany();
    await User.deleteMany();
    await Journey.deleteMany();

    console.log('Existing data cleared.');

    // Seed Trains
    await Train.insertMany(trains);
    console.log(`${trains.length} Trains seeded.`);

    // Seed Divisions
    await Division.insertMany(divisions);
    console.log(`${divisions.length} Divisions seeded.`);

    // Seed Allowance Rules
    await AllowanceRule.insertMany(allowanceRules);
    console.log(`${allowanceRules.length} Allowance Rules seeded.`);

    // Seed Users (Staff & Admin)
    const admin = new User({
      name: 'Admin Supervisor',
      email: 'admin@railassist.com',
      password: 'Password123',
      role: 'Railway Supervisor',
      division: 'DLI',
      isAdmin: true,
      subscriptionTier: 'Enterprise',
      subscriptionStatus: 'Active'
    });
    await admin.save();

    const staff = new User({
      name: 'Rajesh Kumar',
      email: 'staff@railassist.com',
      password: 'Password123',
      role: 'TTE',
      division: 'BCT',
      isAdmin: false,
      subscriptionTier: 'Premium',
      subscriptionStatus: 'Active'
    });
    await staff.save();

    console.log('Users seeded successfully. Credentials:');
    console.log('  Staff: staff@railassist.com / Password123');
    console.log('  Admin: admin@railassist.com / Password123');

    // Create a few sample journeys for the staff user
    const sampleJourneys = [
      {
        userId: staff._id,
        trainNumber: '12951',
        trainName: 'Mumbai Rajdhani Express',
        departureStation: 'MMCT',
        arrivalStation: 'NDLS',
        scheduledDeparture: new Date('2026-06-10T16:00:00Z'),
        scheduledArrival: new Date('2026-06-11T08:30:00Z'),
        actualDeparture: new Date('2026-06-10T16:15:00Z'), // 15 mins delay
        actualArrival: new Date('2026-06-11T08:45:00Z'),
        departureFromHq: new Date('2026-06-10T15:00:00Z'),
        arrivalAtHq: new Date('2026-06-11T09:30:00Z'),
        distanceKm: 1386,
        delayMinutes: 15,
        taAmount: 800, // Duration is ~18.5 hours (>12h -> 100% of 800)
        ndaAmount: 1440, // 8 hours night duty (22:00 to 06:00) * 180 rate
        nightDutyHours: 8,
        notes: 'Smooth journey. Checking tickets in Coach A1-A3.',
        localId: 'local-1'
      },
      {
        userId: staff._id,
        trainNumber: '12001',
        trainName: 'Bhopal Shatabdi Express',
        departureStation: 'RKMP',
        arrivalStation: 'NDLS',
        scheduledDeparture: new Date('2026-06-12T15:10:00Z'),
        scheduledArrival: new Date('2026-06-12T23:30:00Z'),
        actualDeparture: new Date('2026-06-12T15:10:00Z'),
        actualArrival: new Date('2026-06-12T23:35:00Z'),
        departureFromHq: new Date('2026-06-12T14:30:00Z'),
        arrivalAtHq: new Date('2026-06-12T23:59:00Z'),
        distanceKm: 701,
        delayMinutes: 5,
        taAmount: 560, // Duration is ~9.5 hours (6-12h -> 70% of 800 = 560)
        ndaAmount: 285, // 22:00 to 23:35 = 1h 35m = 1.58 hours * 180 rate = 285
        nightDutyHours: 1.58,
        notes: 'Brief delay near Mathura.',
        localId: 'local-2'
      }
    ];

    await Journey.insertMany(sampleJourneys);
    console.log('Sample journeys seeded.');

    mongoose.connection.close();
    console.log('Seeding finished successfully.');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();
