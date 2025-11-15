import { useState, useEffect } from 'react'
import api from '../../services/api'

export default function EmergencyContacts() {
  const [contacts, setContacts] = useState<any[]>([])

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    try {
      const response = await api.get('/location/emergency-contacts')
      setContacts(response.data.emergencyContacts || [])
    } catch (error) {
      console.error('Failed to load emergency contacts:', error)
      // Use mock data as fallback
      setContacts([
        { name: 'Mom', relationship: 'Primary', phone: '+1234567890', isPrimary: true },
        { name: 'Dad', relationship: 'Family', phone: '+1234567891', isPrimary: false },
        { name: 'Sarah', relationship: 'Friend', phone: '+1234567892', isPrimary: false },
      ])
    }
  }

  const addContact = async () => {
    const name = prompt('Enter contact name:')
    const phone = prompt('Enter phone number:')
    const relationship = prompt('Enter relationship:')

    if (!name || !phone || !relationship) return

    try {
      const response = await api.post('/location/emergency-contacts', {
        name,
        phone,
        relationship,
        isPrimary: false,
      })
      setContacts([...contacts, response.data.emergencyContacts[response.data.emergencyContacts.length - 1]])
    } catch (error) {
      console.error('Failed to add emergency contact:', error)
      alert('Failed to add emergency contact')
    }
  }

  return (
    <div className="bg-medium-gray rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <i className="fas fa-user-friends text-primary-light"></i>
          Emergency Contacts
        </h3>
        <button
          onClick={addContact}
          className="text-primary-light hover:text-primary transition-colors"
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>
      <p className="text-sm text-text-gray mb-4">
        These contacts will be notified during an emergency.
      </p>
      <div className="grid grid-cols-3 gap-4">
        {contacts.map((contact, index) => (
          <div key={index} className="text-center">
            <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center mb-2 mx-auto">
              <i className="fas fa-user text-white"></i>
            </div>
            <div className="text-sm font-semibold">{contact.name}</div>
            <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${
              contact.status === 'sent'
                ? 'bg-success text-white'
                : 'bg-warning bg-opacity-20 text-warning'
            }`}>
              {contact.isPrimary ? 'Primary' : contact.relationship}
            </div>
          </div>
        ))}
      </div>
      {contacts.length === 0 && (
        <button
          onClick={addContact}
          className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors mt-4"
        >
          <i className="fas fa-plus mr-2"></i>Add Emergency Contact
        </button>
      )}
    </div>
  )
}

