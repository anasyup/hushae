// Pakistan provinces → cities (delivery coverage data served via /api/locations)
const LOCATIONS = {
  'Punjab': [
    'Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Sialkot', 'Bahawalpur', 'Sargodha',
    'Gujrat', 'Sheikhupura', 'Jhang', 'Kasur', 'Rahim Yar Khan', 'Sahiwal', 'Okara', 'Wah Cantt',
    'Dera Ghazi Khan', 'Chiniot', 'Kamoke', 'Hafizabad', 'Khanewal', 'Muzaffargarh', 'Attock',
    'Jhelum', 'Chakwal', 'Mianwali', 'Bhakkar', 'Layyah', 'Vehari', 'Narowal', 'Pakpattan',
    'Toba Tek Singh', 'Mandi Bahauddin', 'Khushab', 'Lodhran', 'Bahawalnagar', 'Rajanpur', 'Kot Addu',
    'Murree', 'Taxila', 'Burewala', 'Arifwala', 'Chishtian', 'Mian Channu', 'Khanpur', 'Ahmadpur East',
    'Daska', 'Gojra', 'Muridke', 'Jaranwala', 'Wazirabad', 'Pattoki', 'Pindi Bhattian', 'Shakargarh',
  ],
  'Sindh': [
    'Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Mirpurkhas', 'Nawabshah', 'Jacobabad', 'Shikarpur',
    'Khairpur', 'Dadu', 'Badin', 'Thatta', 'Tando Adam', 'Tando Allahyar', 'Umerkot', 'Sanghar',
    'Ghotki', 'Kashmore', 'Jamshoro', 'Kotri', 'Sehwan', 'Matiari', 'Naushahro Feroze', 'Shahdadkot',
    'Ratodero', 'Kandhkot', 'Rohri', 'Mehar', 'Tando Muhammad Khan', 'Hala', 'Mithi', 'Moro',
  ],
  'Khyber Pakhtunkhwa': [
    'Peshawar', 'Mardan', 'Abbottabad', 'Mingora', 'Saidu Sharif', 'Kohat', 'Dera Ismail Khan', 'Bannu',
    'Nowshera', 'Charsadda', 'Swabi', 'Haripur', 'Mansehra', 'Chitral', 'Timergara', 'Batkhela',
    'Buner', 'Lakki Marwat', 'Tank', 'Karak', 'Hangu', 'Battagram', 'Parachinar', 'Miranshah', 'Wana', 'Khar',
  ],
  'Balochistan': [
    'Quetta', 'Hub', 'Turbat', 'Khuzdar', 'Chaman', 'Gwadar', 'Zhob', 'Sibi', 'Loralai', 'Mastung',
    'Kalat', 'Pishin', 'Kharan', 'Panjgur', 'Dera Murad Jamali', 'Usta Muhammad', 'Kuchlak', 'Pasni',
    'Nushki', 'Uthal', 'Bela', 'Dalbandin', 'Taftan', 'Qilla Abdullah', 'Qilla Saifullah', 'Ziarat', 'Jaffarabad',
  ],
  'Gilgit-Baltistan': [
    'Gilgit', 'Skardu', 'Karimabad (Hunza)', 'Aliabad', 'Gahkuch (Ghizer)', 'Chilas', 'Astore',
    'Khaplu', 'Shigar', 'Jaglot', 'Sost', 'Gulmit', 'Gupis', 'Yasin', 'Danyore',
  ],
  'Azad Kashmir': [
    'Muzaffarabad', 'Mirpur', 'Rawalakot', 'Kotli', 'Bagh', 'Bhimber', 'Palandri', 'Athmuqam',
    'Hattian Bala', 'Haveli (Kahuta)', 'Dadyal', 'Chakswari', 'Garhi Dupatta', 'Dhirkot',
  ],
  'Islamabad (ICT)': [
    'Islamabad', 'Bani Gala', 'Bhara Kahu', 'Chak Shahzad', 'Tarnol', 'Sihala', 'Nilore',
  ],
};

const PROVINCES = Object.keys(LOCATIONS);

module.exports = { LOCATIONS, PROVINCES };
