import { StyleSheet } from 'react-native';
import Colors from './Colors';

export default StyleSheet.create({
  centeredContainer: {
    flex: 1,
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacedContainer: {
    flex: 1,
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  flexStartContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: Colors.White,
  },
});
