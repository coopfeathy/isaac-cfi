'use client';

import { useState } from 'react';

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingFormModal({ isOpen, onClose }: BookingFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    preferredDate: '',
    flightType: 'discovery',
    aircraft: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          preferredDate: '',
          flightType: 'discovery',
          aircraft: '',
          message: '',
        });
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending booking:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {isOpen && (
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-black to-gray-900 p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Book Your Flight</h2>
              <p className="text-golden text-sm mt-1">Fill out the form below</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-golden transition-colors text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Form */}
          {!success ? (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-golden"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-golden"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-golden"
                  placeholder="(123) 456-7890"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Flight Type *
                </label>
                <select
                  name="flightType"
                  value={formData.flightType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-golden"
                >
                  <option value="discovery">Discovery Flight</option>
                  <option value="training">Flight Training</option>
                  <option value="rental">Aircraft Rental</option>
                  <option value="tour">NYC Flight Tour</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preferred Aircraft
                </label>
                <select
                  name="aircraft"
                  value={formData.aircraft}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-golden"
                >
                  <option value="">No preference</option>
                  <option value="N888MS">N888MS Sport Cruiser (Lumberton, NJ)</option>
                  <option value="N2152Z">N2152Z Piper Warrior (Long Island, NY)</option>
                  <option value="N1624Q">N1624Q Cessna 150 (Warwick, NY)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preferred Date
                </label>
                <input
                  type="date"
                  name="preferredDate"
                  value={formData.preferredDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-golden"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Message
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-golden resize-none"
                  placeholder="Any special requests or questions..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-golden text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Booking...' : 'Submit'}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 text-center">
              <div className="text-5xl mb-4">✓</div>
              <p className="text-lg font-semibold text-black">Booking received!</p>
              <p className="text-gray-600 text-sm mt-2">We'll contact you soon to confirm.</p>
            </div>
          )}
        </div>
        )}
      </div>
    </>
  );
}
