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
  dateToString, loadAcceptedSchedule, dateforAgenda, loadAvailableSchedule, loadUser,
} from '../components/Functions';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import CommonStyles from '../components/CommonStyles';

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
        const trainer = await loadUser(this.props.trainerKey);
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
      <Text style={styles.agendaItemTitle}>{item.text}</Text>
      <Text style={styles.agendaItemText}>
        Start:
        {' '}
        {dateToString(item.start)}
      </Text>
      <Text style={styles.agendaItemText}>
        End:
        {' '}
        {dateToString(item.end)}
      </Text>
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
      <View style={[CommonStyles.flexStartContainer, { alignItems: 'flex-start' }]}>
        <BackButton style={styles.backButton} />
        <Text style={styles.trainerName}>{this.state.trainer.name}</Text>
        <View style={styles.calendarContainer}>
          <Agenda
            style={styles.calendar}
            theme={{
              backgroundColor: Colors.White,
              calendarBackground: Colors.LightGray,
              selectedDayBackgroundColor: Colors.Primary,
              dotColor: Colors.Secondary,
              selectedDotColor: Colors.Secondary,
              todayTextColor: Colors.Primary,
            }}
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
    marginHorizontal: 15,
    marginVertical: 10,
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  calendarContainer: {
    height: '85%',
    width: '100%',
  },
  calendar: {
    height: '100%',
    width: '100%',
  },
  agendaItem: {
    ...CommonStyles.shadow,
    height: 100,
    width: '90%',
    borderRadius: 10,
    padding: 10,
    backgroundColor: Colors.LightGray,
    textAlign: 'left',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    margin: 10,
  },
  agendaItemTitle: {
    color: Colors.Primary,
    fontSize: 20,
  },
  agendaItemText: {
    fontSize: 15,
  },
});
