import streamlit as st
import numpy as np

# Quartile thresholds from RFM analysis
r_quartiles = [26, 96, 380]
f_quartiles = [1, 3, 7]
m_quartiles = [347.8, 897.62, 2304.18]

def r_score(recency):
    if recency <= r_quartiles[0]:
        return 4
    elif recency <= r_quartiles[1]:
        return 3
    elif recency <= r_quartiles[2]:
        return 2
    else:
        return 1

def f_score(frequency):
    if frequency <= f_quartiles[0]:
        return 1
    elif frequency <= f_quartiles[1]:
        return 2
    elif frequency <= f_quartiles[2]:
        return 3
    else:
        return 4

def m_score(monetary):
    if monetary <= m_quartiles[0]:
        return 1
    elif monetary <= m_quartiles[1]:
        return 2
    elif monetary <= m_quartiles[2]:
        return 3
    else:
        return 4

def get_segment(score):
    if score >= 10:
        return 'Champions'
    elif score >= 7:
        return 'Loyal'
    elif score >= 4:
        return 'At Risk'
    else:
        return 'Lost'

recommendations = {
    'Champions': '🏆 Reward with loyalty perks, offer early access to new products, ask for reviews.',
    'Loyal': '💚 Enrol in loyalty programme, send personalised offers, encourage higher spend.',
    'At Risk': '⚠️ Send win-back email, offer time-limited discount, ask for feedback.',
    'Lost': '❌ Low priority '
}

# App
st.title('RFM Customer Segmentation')
st.divider()
st.write('Enter customer details to predict their segment and get a recommended action.')
st.divider()

recency = st.number_input('Recency (days since last purchase)', min_value=0, max_value=1000, value=50)
frequency = st.number_input('Frequency (number of orders)', min_value=1, max_value=500, value=5)
monetary = st.number_input('Monetary (total spend £)', min_value=0.0, max_value=1000000.0, value=500.0, step=0.01)

st.divider()
predict_button = st.button('Predict Segment')
st.divider()

if predict_button:
    r = r_score(recency)
    f = f_score(frequency)
    m = m_score(monetary)
    total = r + f + m
    segment = get_segment(total)
    
    st.balloons()
    st.success(f'**Segment: {segment}**')
    st.write(f'RFM Score: {total}/12')
    st.write(f'**Recommended Action:** {recommendations[segment]}')