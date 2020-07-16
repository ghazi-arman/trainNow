import { REQUIRED_DISTANCE_METERS } from 'react-native-dotenv';

export default {
  trainerType: 'trainer',
  clientType: 'client',
  managerType: 'manager',
  managedType: 'managed',
  independentType: 'independent',
  groupSessionType: 'group',
  personalSessionType: 'personal',
  newClientPercentage: 0.15,
  regularClientPercentage: 0.05,
  groupSessionPercentage: 0.15,
  faqUrl: 'https://trainnow.fit/faq',
  requiredDistanceToGymMeters: REQUIRED_DISTANCE_METERS,
  metersToMilesMultiplier: 0.000621371,
};
