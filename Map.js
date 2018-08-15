import React, {Component} from 'react';
import { 
  Platform,
  StyleSheet,
  Text,
  View,
  Button,
  Picker,
  Alert,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  DatePickerIOS
} from 'react-native';
import {Permissions, Location, Font, AppLoading, MapView} from 'expo';
import firebase from 'firebase';
import Modal from 'react-native-modal';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { Actions } from 'react-native-router-flux';

export class Map extends Component {
  // Initialize Firebase
  constructor(props) {
    super(props);

    this.state = {
      userRegion: {},
      mapRegion: {},
      user: {},
      gyms: [],
      pendingSessions: [],
      acceptSessions: [],
      selectedGym: 'null',
      selectedTrainer: 'null',
      bookingTrainer: 'null',
      bookDate: new Date(),
      bookDuration: '60',
      userLoaded: false,
      fontLoaded: false,
      locationLoaded: false,
      gymModal: false,
      pendingModal: false,
      bookModal: false,
      unRead: false,
      pendingLoaded: false,
      alertPresent: false
    }

    this.bookTrainer=this.bookTrainer.bind(this);
    this.acceptSession=this.acceptSession.bind(this);
    this.cancelSession=this.cancelSession.bind(this);
  }

  componentWillUnmount(){
    clearInterval(this._interval);
  }

  async componentDidMount() {

    if(!this.state.fontLoaded){
      this.loadFont();
    }

    if(!this.state.locationLoaded){
      this.getLocationAsync();
    }

    //get gyms from db
    var gyms = this.loadGyms();

    //send info to the state
    this.setState({
      gyms: gyms,
    });

    //Get user info for state
    var user = firebase.auth().currentUser;
    var usersRef = firebase.database().ref('users');
    usersRef.orderByKey().equalTo(user.uid).on('child_added', function(snapshot) {
      this.setState({user: snapshot.val()});
    }.bind(this));


    //Re Render every 10 seconds for pendingMessages
    this._interval = setInterval(() => {

      this.checkSessions(user.uid);
      this.checkRead(user.uid);

      if(!this.state.pendingLoaded || this.state.unRead){
        //get pendingSessions from db
        var pending = this.loadPending(user.uid);

        //get Accepted Session from db
        var accepted = this.loadAccept(user.uid);

        this.state.pendingLoaded = true;

        //send info to the state
        this.setState({
          pendingSessions: pending,
          acceptSessions: accepted,
        });


        if(this.state.unRead){
          if(!this.state.alertPresent){
            Alert.alert(
            'You have a new Session!',
            '',
            [
              {text: 'View', onPress: () => {
                this.showModal('pending');
              }}  
            ]);
          }
          this.state.alertPresent = true;
        }
      }
    }, 2000);
  }

  //LoadFont function
  loadFont = async () => {
    await Font.loadAsync({
      FontAwesome: require('./fonts/font-awesome-4.7.0/fonts/FontAwesome.otf'),
      fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
      lato: require('./fonts/Lato/Lato-Regular.ttf'),
      latoBold: require('./fonts/Lato/Lato-Bold.ttf')
    });
    this.setState({fontLoaded: true});
  }

  //Gets user location and updates mapRegion in state
  getLocationAsync = async () => {

    //grab user location and store it
    let { status } = await Permissions.askAsync(Permissions.LOCATION);
    let location = await Location.getCurrentPositionAsync({});
    this.setState({
      userRegion: {
        latitude:  Number(JSON.stringify(location.coords.latitude)),
        longitude: Number(JSON.stringify(location.coords.longitude)),
        latitudeDelta: 0.0422,
        longitudeDelta: 0.0221
      }, mapRegion: {
        latitude:  Number(JSON.stringify(location.coords.latitude)),
        longitude: Number(JSON.stringify(location.coords.longitude)),
        latitudeDelta: 0.0422,
        longitudeDelta: 0.0221
      },
      locationLoaded: true,
    });
  };


  //updates mapRegion object in state
  handleMapRegionChange = mapRegion => {
    if(this.state.regionSet){
      this.setState({ mapRegion });
    }else{
      return;
    }
  };

  checkSessions(userKey){
      //Check for Session in Progress
      var sessionRef = firebase.database().ref('trainSessions');
      var currDate = new Date();
      sessionRef.orderByKey().equalTo(userKey).on('child_added', function(snapshot){
        var session = snapshot.val();
        if(new Date(session.start) < currDate && session.end == null){
          Actions.reset('session');
        }else if(session.end != null && session.traineeRating == null){
          Actions.reset('rating');
        }
      });

      sessionRef.orderByChild('trainer').equalTo(userKey).on('child_added', function(snapshot){
        var session = snapshot.val();
        if(new Date(session.start) < currDate && session.end == null){
          Actions.reset('session');
        }else if(session.end != null && session.trainerRating == null){
          Actions.reset('rating');
        }
      });
  }

  checkRead(userKey){
    var pendingRef = firebase.database().ref('pendingSessions');
    var acceptRef = firebase.database().ref('trainSessions');
    var acceptSession = pendingSession = null;
    
    //Only need to send trainers a notification for pending Sessions
    pendingRef.orderByChild('trainer').equalTo(userKey).once('child_added', function(snapshot) {
      pendingSession = snapshot.val();
      if(typeof pendingSession.read !== 'undefined' && pendingSession.read == false){
        this.setState({unRead: true});
      }
    }.bind(this));

    //Only need to send trainees a notification for accepted Sessions
    acceptRef.orderByKey().equalTo(userKey).once('child_added', function(snapshot) {
      acceptSession = snapshot.val();
      if(typeof acceptSession.read !== 'undefined' && acceptSession.read == false){
        this.setState({unRead: true});
      }
    }.bind(this));

  }

  //Load Pending Sessions still awaiting accept for trainer
  loadPending(userKey){
    var pendingRef = firebase.database().ref('pendingSessions');
    var pendingSession = null;
    var pendingSessions = [];
    
    pendingRef.orderByChild('trainer').equalTo(userKey).once('child_added', function(snapshot) {
      pendingSession = snapshot.val();
      pendingSessions.push(pendingSession);
    }.bind(this));

    pendingRef.orderByKey().equalTo(userKey).once('child_added', function(snapshot) {
      pendingSession = snapshot.val();
      pendingSessions.push(pendingSession);
    }.bind(this));

    return pendingSessions;
  }

  loadAccept(userKey){
    var unRead;
    var acceptRef = firebase.database().ref('trainSessions');
    var acceptSession = null;
    var acceptSessions = [];
    
    acceptRef.orderByChild('trainer').equalTo(userKey).once('child_added', function(snapshot) {
      acceptSession = snapshot.val();
      acceptSessions.push(acceptSession);
    }.bind(this));

    acceptRef.orderByKey().equalTo(userKey).once('child_added', function(snapshot) {
      acceptSession = snapshot.val();
      acceptSessions.push(acceptSession);
    }.bind(this));

    return acceptSessions;
  }

  markRead(){
    var user = firebase.auth().currentUser;
      this.state.pendingSessions.map(function(session){
        if(user.uid == session.trainer){
          firebase.database().ref('/pendingSessions/'+ session.trainee).update({
            read: true
          });
        }
      });
    this.state.acceptSessions.map(function(session){
      if(user.uid == session.trainee){
        firebase.database().ref('/trainSessions/'+ session.trainee).update({
          read: true
        });
      }
    });
    this.setState({unRead: false});
  }


  //Load gyms from db for MapView
  loadGyms(){
    var items = [];
    var gymsRef = firebase.database().ref('gyms');
    gymsRef.once('value', function(data) {
      data.forEach(function(dbevent) {
        var item = dbevent.val();
        item.key = dbevent.key;
        items.push(item);
      });
    });

    return items;
  }

  //ShowModal function to open up different modals
  showModal(type, option){
    
    //open gym modal
    if(type == 'gym'){
      //pull gym from db onClick to make sure info is updated (eg. trainer is active)
      firebase.database().ref('/gyms/' + option.key).once('value', function(snapshot){
        this.setState({
          bookModal: false,
          gymModal: true,
          selectedGym: snapshot.val()
        });
      }.bind(this));
    }

    //open book modal
    if(type == 'book'){
      this.setState({
        gymModal: false,
        bookingTrainer: option
      });
      setTimeout(() => this.setState({bookModal: true}), 800);
    }

    //open pending modal
    if(type == 'pending'){
      this.markRead();
      this.setState({
        pendingModal: true,
      });
    }
  }

  //Hide Modal Functions
  hidegymModal = () => this.setState({ gymModal: false });
  hidebookModal = () => this.setState({ bookModal: false, bookingTrainer: 'null' });
  hidependingModal = () => this.setState({pendingModal: false});


  //extend Trainer to show bio and certs
  extendTrainer(trainer){
    if(this.state.selectedTrainer == trainer){
      return null;
    }else{
      return trainer;
    }
  }

  //book a session with a trainer
  bookTrainer(){
    var user = firebase.auth().currentUser;
    var pendingRef = firebase.database().ref('pendingSessions');

    if(user.uid == this.state.bookingTrainer.key){
  
      Alert.alert('You cannot book yourself as a Trainer!');
      return;

    }else if(this.state.bookingTrainer.active == false){
      
      Alert.alert('Sorry, this trainer is no longer active.');
      return;

    }else{
      Alert.alert(
      'Are you sure you want to book this session?',
      '',
      [
        {text: 'No'},
        {text: 'Yes', onPress: () => {
          pendingRef.child(user.uid).set({
          trainee: user.uid,
          traineeName: this.state.user.name,
          trainer: this.state.bookingTrainer.key,
          trainerName: this.state.bookingTrainer.name,
          start: this.state.bookDate.toString(),
          duration: this.state.bookDuration,
          location: this.state.selectedGym.location,
          rate: this.state.bookingTrainer.rate,
          read: false,
          });
          Alert.alert('Session Booked');
        }},
      ]);
    }
  }

  //Accept pending Session as trainer
  acceptSession(session){
    var user = firebase.auth().currentUser;
    var sessionRef = firebase.database().ref('trainSessions');
    var pendingRef = firebase.database().ref('pendingSessions');

    Alert.alert(
      'Are you sure you want to accept this session?', 
      '',
      [
        {text: 'No'},
        {text: 'Yes', onPress: () => {
          sessionRef.child(session.trainee).set({
            trainee: session.trainee,
            trainer: session.trainer,
            traineeName: session.traineeName,
            trainerName: session.trainerName,
            start: session.start,
            duration: session.duration,
            location: session.location,
            rate: session.rate,
            traineeLoc: null,
            trainerLoc: null,
            trainerReady: false,
            traineeReady: false,
            met: false,
            read: false,
            end: null,
            traineeRating: null,
            trainerRating: null,
            traineeEnd: false,
            trainerEnd: false,
          });
          pendingRef.child(session.trainee).remove();
        }
      }]);
    this.setState({pendingLoaded: false});
  }

  //Cancel pending session as trainee
  cancelSession(session){
    var pendingRef = firebase.database().ref('pendingSessions');
    Alert.alert(
      'Are you sure you want to cancel this session?', 
      '',
      [
        {text: 'No'},
        {text: 'Yes', onPress: () => {
          pendingRef.child(session.trainee).remove();
        }
      }]);
    this.setState({pendingLoaded: false});
  }

  //Cancel accept session as trainee
  cancelAccept(session){
    var sessionRef = firebase.database().ref('trainSessions');
        Alert.alert(
      'Are you sure you want to cancel this session?', 
      '',
      [
        {text: 'No'},
        {text: 'Yes', onPress: () => {
          sessionRef.child(session.trainee).remove();
        }
      }]);
    this.setState({pendingLoaded: false});
  }

  //Go to account page
  showAccount() {
    Actions.account();
  }

  //Convert Date to readable format
  dateToString(start){

    var pendingDate = new Date(start);
    var month = pendingDate.getMonth() + 1;
    var day = pendingDate.getDate();
    var hour = pendingDate.getHours();
    var minute = pendingDate.getMinutes();
    var abbr;

    if(minute < 10){
        minute = '0' + minute;
    }
    //Sets abbr to AM or PM
    if(hour > 12){
      hour = hour - 12;
      abbr = 'PM';
    }else{
      abbr = 'AM'
    }

    var displayDate = month + '/' + day + ' ' + hour + ':' + minute + abbr;
    return displayDate;
  }

  render() {
    if(!this.state.fontLoaded || typeof this.state.userRegion.latitude === 'undefined' || this.state.userRegion === null){
      return <Expo.AppLoading />;
    }
    if(this.state.pendingSessions != null){

      var uid = firebase.auth().currentUser.uid;
      var pendingList =  this.state.pendingSessions.map(function(session){

        var displayDate = this.dateToString(session.start);

        if(session.trainee == uid){

          var button = (
            <TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.cancelSession(session)}>
              <Text 
                style={styles.buttonText}
              >
              Cancel
              </Text>
            </TouchableOpacity>);
          var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.trainerName}</Text></View>);
        
        }else{

          var button = (
            <TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.acceptSession(session)}>
              <Text 
                style={styles.buttonText}
              >
              Accept
              </Text>
            </TouchableOpacity>);
            var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.traineeName}</Text></View>);
        }
        return(
        <View style={{flexDirection: 'column', justifyContent: 'flex-start'}} key={session.trainee}>
          <View style={{flexDirection: 'row', justifyContent: 'space-around', height: 50}} key={session.trainee}>
            <View style={{width: '70%', flexDirection: 'row', justifyContent: 'space-around', height: 50}}>
              {name}
              <View style={styles.rateView}><Text style={styles.trainerInfo}>{session.duration} min</Text></View>
              <View style={styles.trainerView}><Text style={styles.trainerInfo}>{displayDate}</Text></View>
            </View> 
            <View style={{width: '25%', height: 50}}>
              {button}
            </View>
          </View>
        </View>
        );
      }.bind(this));
    }

      if(this.state.acceptSessions != null){
      var uid = firebase.auth().currentUser.uid;
      var acceptList =  this.state.acceptSessions.map(function(session){
        var displayDate = this.dateToString(session.start);
        if(session.trainee == uid){
          var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.trainerName}</Text></View>);
        }else{
            var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.traineeName}</Text></View>);
        }
        return(
        <View style={{flexDirection: 'column', justifyContent: 'flex-start'}} key={session.trainee}>
          <View style={{flexDirection: 'row', justifyContent: 'space-around', height: 50}} key={session.trainee}>
            <View style={{width: '70%', flexDirection: 'row', justifyContent: 'space-around', height: 50}}>
              {name}
              <View style={styles.rateView}><Text style={styles.trainerInfo}>{session.duration} min</Text></View>
              <View style={styles.trainerView}><Text style={styles.trainerInfo}>{displayDate}</Text></View>
            </View> 
            <View style={{width: '25%', height: 50}}>
              <TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.cancelAccept(session)}>
                <Text 
                  style={styles.buttonText}
                >
                Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        );
      }.bind(this));
    }
    if(this.state.selectedGym != 'null'){
        var map = (
        <MapView
          ref = {(mapView) => { _map = mapView; }}
          style={styles.container}
          region={{
            latitude: this.state.selectedGym.location.latitude,
            longitude: this.state.selectedGym.location.longitude,
            latitudeDelta: 0.0422,
            longitudeDelta: 0.0221
          }}
          pitchEnabled = {false} rotateEnabled = {false} scrollEnabled = {false} zoomEnabled = {false}>
              <MapView.Marker
                ref={marker => (this.marker = marker)}
                key={this.state.selectedGym.key}
                coordinate={this.state.selectedGym.location} />
        </MapView>);
      var trainers = this.state.selectedGym.trainers;
      var trainersList = Object.keys(trainers).map(function(key, index){
        var trainer = trainers[key];
        trainer.key = key;

        //Sets up bio and certifications area if a trainer is selected in gym modal
        if(this.state.selectedTrainer != null && this.state.selectedTrainer.key == key){
        var biocertField = (
          <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}} key={key}>
            <View style={styles.certView}><Text style={styles.trainerInfo}>Certifications: {this.state.selectedTrainer.cert}</Text></View>
            <View style={styles.certView}><Text style={styles.trainerInfo}>Bio: {this.state.selectedTrainer.bio}</Text></View>
          </View>);
        }

        //Get active status of trainer
        var activeField;
        if(trainer.active == true){
          activeField = <View style={styles.activeView}><Text style={[styles.trainerInfo, styles.active]}>Active</Text></View>
        }else{
          activeField = <View style={styles.activeView}><Text style={[styles.trainerInfo, styles.away]}>Away</Text></View>
        }

        //DOM Element for a trainer in gym modal
        return(
        <View style={styles.trainerContainer} key={key}>
        <TouchableWithoutFeedback onPress={() => this.setState({selectedTrainer: this.extendTrainer(trainer)})}>
          <View style={styles.trainerRow} key={trainer.key}>
            <View style={styles.trainerInfoContainer}>
              <View style={styles.trainerView}><Text style={styles.trainerInfo}>{trainer.name}</Text></View>
              <View style={styles.rateView}><Text style={styles.trainerInfo}>${trainer.rate}</Text></View>
              {activeField}
            </View> 
            <View style={{width: '25%', height: 50}}>
              <TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.showModal('book', trainer)}>
                <Text 
                  style={styles.buttonText}
                >
                Book Now!
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
        {biocertField}
        </View>

        );
      }.bind(this));
      if(!this.state.gymModal){
        trainersList = null;
      }
    }
    return (
      <View
        style={styles.container}
      >
        <MapView
          ref = {(mapView) => { _map = mapView; }}
          style={styles.container}
          onRegionChange={this.handleMapRegionChange}
          region={this.state.mapRegion}
          showsUserLocation={true}
          onMapReady={() => {
            this.setState({ regionSet: true });
          }}
        >
          {this.state.gyms.map(marker => (
              <MapView.Marker
                ref={marker => (this.marker = marker)}
                key={marker.key}
                coordinate={marker.location}
                onPress={() => {
                 this.showModal('gym', marker);
                }} />
          ))}
        </MapView>

        <View style={styles.bottomBar}>

          <TouchableOpacity
              style={styles.centerButton}
              onPressIn={() =>_map.animateToRegion(this.state.userRegion, 499)}
          >
            <Text style={{ fontSize: 50, color: '#FFFFFF' }}>
                <FontAwesome>{Icons.compass}</FontAwesome>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
              style={styles.accountButton}
              onPressIn={this.showAccount.bind(this)}
          >
            <Text style={{ fontSize: 50, color: '#FFFFFF' }}>
                <FontAwesome>{Icons.user}</FontAwesome>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
              style={styles.accountButton}
              onPressIn={() => this.showModal('pending')}
          >
            <Text style={{ fontSize: 50, color: '#FFFFFF' }}>
                <FontAwesome>{Icons.comment}</FontAwesome>
            </Text>
          </TouchableOpacity>

        </View>

        {/*Gym Modal Info*/}
        <Modal isVisible={this.state.gymModal}
        onBackdropPress={this.hidegymModal}>
          <View style={styles.gymModal}>
            <View style={styles.nameContainer}>
              <Text style={styles.gymName}>{this.state.selectedGym.name}</Text>
            </View>
            <View style={styles.mapContainer}>
              {map}
            </View>
            <Text style={styles.hourDetails}>Hours: {this.state.selectedGym.hours}</Text>
            <Text style={styles.hourDetails}>Trainers</Text>
            <ScrollView style={styles.trainers}>
              {trainersList}
            </ScrollView>
          </View>
        </Modal>

        {/*Pending Sessions Modal*/}
        <Modal isVisible={this.state.pendingModal}
        onBackdropPress={this.hidependingModal}>
          <View style={styles.gymModal}>
            <Text style={styles.gymName}>Upcoming Sessions</Text>
            {acceptList}
            <Text style={styles.gymName}>Pending Sessions</Text>
            {pendingList}
          </View>
        </Modal>

        {/* Booking Modal */}
        <Modal isVisible={this.state.bookModal}
        onBackdropPress={this.hidebookModal}>
          <View style={styles.bookModal}>
            <Text style={styles.hourDetails}>Book Trainer: {this.state.bookingTrainer.name}</Text>
            <Text style={styles.bookDetails}>Certifications: {this.state.bookingTrainer.cert}</Text>
            <Text style={styles.bookDetails}>Bio: {this.state.bookingTrainer.bio}</Text>
            <Text style={styles.bookDetails}>Gym: {this.state.selectedGym.name}</Text>
            <View style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
              <Text style ={styles.bookFormLabel}>Session Date & Time</Text>
              <DatePickerIOS
                mode='time'
                minimumDate={new Date()}
                style={{width: '65%', height: 150}}
                itemStyle={{height: 150}}
                date={this.state.bookDate}
                onDateChange={(bookDate) => this.setState({bookDate: bookDate})}
              />
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 25}}>
              <Text style ={styles.bookFormLabel}>Session Duration</Text>
              <Picker
                style={{width: '65%', height: 150}}
                itemStyle={{height: 150}}
                selectedValue={this.state.bookDuration}
                onValueChange={(itemValue, itemIndex) => this.setState({bookDuration: itemValue})}>
                <Picker.Item label='60' value='60' />
                <Picker.Item label='90' value='90' />
                <Picker.Item label='120' value='120' />
              </Picker>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'center'}}>
              <TouchableOpacity style={styles.bookButton} onPressIn={() => this.bookTrainer()}>
                <Text 
                  style={styles.buttonText}
                  >
                  Schedule Session
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    );
  }
}



const styles = StyleSheet.create({
  bookDetails:{
    fontSize: 20,
    fontWeight: '500'
  },
  bookFormLabel: {
    fontSize: 20,
    fontWeight: '500',
    width: '35%'
  },
  buttonContainer: {
    height: 48,
    backgroundColor: '#C51162',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  bookButton: {
    paddingVertical: 15,
    backgroundColor: '#C51162',
    width: '70%',
    marginTop: 20
  },
  buttonText: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: '700'
  },
  trainerView: {
    width: '25%',
    height: 50
  },
  certView: {
    width: '90%'
  },
  trainerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: 'black',
    margin: 5
  },
  rateView: {
    width: '15%',
    height: 50
  },
  activeView: {
    width: '25%',
    height: 50
  },
  trainerInfoContainer:{
    width: '70%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: 50
  },
  trainers: {
    width: '100%',
    height: '65%'
  },
  mapContainer: {
    height: '20%',
    width: '100%'
  },
  active:{
    color: 'green'
  },
  away:{
    color: 'red'
  },
  trainerInfo: {
    paddingVertical: 15,
    textAlign: 'center', 
    fontSize: 15,
    fontWeight: '700',
  },
  container: {
    position: 'absolute',
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  bottomBar: {
    width: '100%',
    position: 'absolute',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    bottom: 0,
    backgroundColor: '#69D2E7'
  },
  centerButton: {
    position: 'relative',
    borderRadius: 35,
    margin: 10
  },
  trainerContainer: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  gymModal: {
     flex: .7,
     flexDirection: 'column',
     justifyContent: 'flex-start',
     alignItems: 'center',
     backgroundColor: '#fff',
     borderRadius: 10,
  },
  bookModal: {
     flex: .7,
     flexDirection: 'column',
     justifyContent: 'flex-start',
     backgroundColor: '#fff',
  },
  accountButton: {
    borderRadius:35,
    margin: 10
  },
  gymName: {
    fontFamily: 'latoBold',
    fontSize: 30,
    color: 'black',
    fontWeight: '500',
    marginTop: 15,
  },
  nameContainer: {
    height: '15%',
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#A7DBD8',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  hourDetails: {
    fontFamily: 'lato',
    fontSize: 24,
    color: 'black',
    fontWeight: '400',
    marginTop: 10,
    marginBottom: 10
  },
});
