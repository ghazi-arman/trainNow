import React, { Component } from 'react';
import {
  StyleSheet, Text, View, Alert,
} from 'react-native';
import { Agenda } from 'react-native-calendars';
import bugsnag from '@bugsnag/expo';
import PropTypes from 'prop-types';
import { Actions } from 'react-native-router-flux';
import Colors from '../components/Colors';
import {
  dateToString,
  loadAcceptedSchedule,
  dateforAgenda,
  loadAvailableSchedule,
  loadTrainer,
} from '../components/Functions';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

export default class SchedulePage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      date: new Date(),
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    // load trainer info and sessions
    if (!this.state.trainer || !this.state.sessions) {
      try {
        const trainer = await loadTrainer(this.props.trainerKey);
        let sessions = await loadAcceptedSchedule(this.props.trainerKey);
        const availability = await loadAvailableSchedule(this.props.trainerKey);
        sessions = sessions.concat(availability);
        this.setState({ trainer, sessions });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading the trainer\'s schedule.');
        Actions.MapPage();
      }
    }
  }

  renderAgendaItem = (item) => (
    <View style={styles.agendaItem}>
      <Text style={styles.agendaItemHeader}>{item.text}</Text>
      <Text style={styles.agendaItemText}>{dateToString(item.start)}</Text>
      <Text style={styles.agendaItemText}>to</Text>
      <Text style={styles.agendaItemText}>{dateToString(item.end)}</Text>
    </View>
  );

  renderAgendaEvents() {
    const startDate = this.state.date.getTime();
    const endDate = new Date(this.state.date.getTime() + 86400000 * 14).getTime();
    const events = {};
    for (let currDate = startDate; currDate <= endDate; currDate += 86400000) {
      const currentDay = new Date(currDate);
      events[dateforAgenda(currentDay)] = this.state.sessions.filter(
        (session) => dateforAgenda(currentDay) === dateforAgenda(new Date(session.start)),
      );
    }
    return events;
  }

  render() {
    if (!this.state.trainer || !this.state.sessions) {
      return <LoadingWheel />;
    }
    const events = this.renderAgendaEvents();
    return (
      <View style={MasterStyles.flexStartContainer}>
        <View style={styles.nameContainer}>
          <BackButton />
          <Text style={styles.trainerName}>
            {' '}
            {this.state.trainer.name}
            {' '}
          </Text>
        </View>
        <View style={styles.calendarContainer}>
          <Agenda
            style={styles.calendar}
            minDate={this.state.date}
            maxDate={new Date(this.state.date.getTime() + 86400000 * 14)}
            items={events}
            renderItem={this.renderAgendaItem}
            renderEmptyDate={() => (<View />)}
            rowHasChanged={(r1, r2) => r1.text !== r2.text}
          />
        </View>
      </View>
    );
  }
}

SchedulePage.propTypes = {
  trainerKey: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  trainerName: {
    fontSize: 30,
    color: Colors.White,
    fontWeight: '500',
    textAlign: 'center',
  },
  nameContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.Primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    flex: 6,
    width: '100%',
  },
  calendar: {
    height: '100%',
    width: '100%',
  },
  agendaItem: {
    height: 100,
    width: '90%',
    backgroundColor: Colors.Secondary,
    textAlign: 'left',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    margin: 10,
  },
  agendaItemHeader: {
    color: Colors.White,
    fontSize: 20,
    fontWeight: '300',
  },
  agendaItemText: {
    color: Colors.Primary,
    fontSize: 15,
  },
});
