
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const CommunicationModal = ({ visible, customer, onClose, onQuickTransaction }) => {
  if (!customer) {
    return null;
  }

  const options = [

    {
      title: 'WhatsApp SMS',
      icon: 'whatsapp',
      color: '#25D366',
      action: () => Linking.openURL(`whatsapp://send?text=Hello&phone=${customer.mobile}`),
    },
    {
      title: 'WhatsApp Call',
      icon: 'phone',
      color: '#25D366',
      action: () => Linking.openURL(`whatsapp://call?phone=${customer.mobile}`),
    },
    {
      title: 'Normal Call',
      icon: 'phone',
      color: '#007AFF',
      action: () => Linking.openURL(`tel:${customer.mobile}`),
    },
    {
      title: 'Normal SMS',
      icon: 'comment',
      color: '#007AFF',
      action: () => Linking.openURL(`sms:${customer.mobile}`),
    },
  ];

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Actions for {customer.name}</Text>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => {
                option.action();
                onClose();
              }}
            >
              <Icon name={option.icon} size={24} color={option.color} />
              <Text style={styles.optionText}>{option.title}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.optionButton, styles.closeButton]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    width: '100%',
  },
  optionText: {
    fontSize: 18,
    marginLeft: 15,
  },
  closeButton: {
    marginTop: 10,
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
  },
});

export default CommunicationModal;
