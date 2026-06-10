/* ═══════════════════════════════════════════════════════
   PEHLI BAAR — Application Logic
   Connects: Login → Onboarding → Dashboard → Processing → Detail
   ═══════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── State ────────────────────────────────────────
    let currentScreen = 'login';
    let selectedLanguage = 'हिंदी';
    let processingInterval = null;
    let statusInterval = null;
    const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    let currentSessionId = null;
    let currentDocumentData = null;
    let currentAudio = null;
    let googleClientId = '';
    let googleTokenClient = null;

    // Global fetch interceptor to append authorization token
    const originalFetch = window.fetch;
    window.fetch = function (url, options) {
        const token = localStorage.getItem('authToken');
        const urlStr = String(url);
        if (token && urlStr.startsWith(API_BASE_URL) && !urlStr.includes('/api/auth/')) {
            options = options || {};
            options.headers = options.headers || {};
            if (options.headers instanceof Headers) {
                options.headers.set('Authorization', `Bearer ${token}`);
            } else if (Array.isArray(options.headers)) {
                options.headers.push(['Authorization', `Bearer ${token}`]);
            } else {
                options.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        return originalFetch(url, options);
    };

    // ── Internationalization (i18n) ─────────────────
    const translations = {
        en: {
            app_title: "Pehli Baar",
            tagline: "Any document, now in simple language",
            select_language: "Select Your Language",
            begin_button: "Let's Begin",
            // Login
            login_heading: "Welcome!",
            login_subheading: "Sign in to access your documents",
            phone_label: "Phone Number",
            send_otp: "Send OTP",
            or_google: "Continue with Google",
            otp_label: "OTP / One-Time Password",
            resend_otp: "Resend OTP",
            agree_terms: "By continuing, you agree to our Terms & Privacy Policy",
            safe_data: "Your data is secure",
            // Dashboard
            greeting_morning: "Good morning, Aryan 👋",
            greeting_afternoon: "Good afternoon, Aryan 👋",
            greeting_evening: "Good evening, Aryan 👋",
            greeting_sub: "Welcome to Pehli Baar",
            upload_title: "Take a photo of your document",
            upload_desc: "Take a photo of your document to translate & explain",
            camera: "Camera",
            gallery: "Gallery",
            pdf: "PDF",
            categories_all: "All",
            categories_scholarship: "Scholarship",
            categories_fee: "Fee",
            categories_hostel: "Hostel",
            categories_admit: "Admit",
            categories_notice: "Notice",
            documents_count: "6 Documents",
            recent_first: "Recent first",
            // Sidebar / Nav
            nav_home: "Home",
            nav_docs: "Documents",
            nav_glossary: "Glossary",
            nav_support: "Support",
            nav_upload: "Upload Document",
            change_language: "Change Language",
            // Detail
            listen: "Listen",
            share: "Share",
            save: "Save",
            tldr_title: "Most Important Point",
            tldr_content: "You need to deposit the fee of ₹45,000 before July 15. For this, it is mandatory to have an income certificate and Aadhaar card.",
            fee_amount: "Fee Amount",
            last_date: "Last Date",
            account_no: "Account No.",
            next_steps: "Next Steps",
            english_phrases: "English Phrases",
            original_label: "Original:",
            step_1_text: "Keep your 'Income Certificate' ready.",
            step_2_text: "Click on the 'Registration' button on the website.",
            step_3_text: "After uploading the documents, click 'Final Submit'.",
            checklist_title: "Checklist and Deadline",
            chk_aadhaar: "Link Aadhaar Card",
            chk_bank: "Verify Bank Account",
            days_left_3: "3 days left",
            days_left_7: "7 days left",
            chk_passbook: "Photocopy of bank passbook",
            days_left_12: "12 days left",
            chk_bonafide: "Bonafide letter from college",
            days_left_25: "25 days left",
            difficult_words_title: "Difficult Words / Definitions",
            glossary_scholarship_desc: "Financial aid provided by government or organizations to help you study.",
            glossary_eligibility_desc: "Requirements or conditions you must meet to qualify for a benefit.",
            glossary_mandatory_desc: "Compulsory or required by law/rules; you must do it.",
            // Support
            support_title: "Support & Help",
            support_desc: "We are here to help you navigate your college journey",
            chat_ai: "Chat with AI Assistant",
            call_help: "Call Support Helpdesk",
            faq_title: "Frequently Asked Questions",
            faq_1_q: "How does Pehli Baar work?",
            faq_1_a: "Simply take a photo of any college document. Our AI translates it into your local language, explains tough terms, and provides an audio summary.",
            faq_2_q: "Is my data safe?",
            faq_2_a: "Yes. All uploaded documents are processed securely and deleted from our servers immediately after analysis. Your data is private.",
            faq_3_q: "Which languages are supported?",
            faq_3_a: "We currently support Hindi, Marathi, Tamil, Bengali, Telugu, and English.",
            // Glossary
            glossary_title: "Glossary / शब्दकोश",
            search_glossary_placeholder: "Search a term... / शब्द खोजें...",
            search_docs_placeholder: "Search documents... / दस्तावेज खोजें...",
            terms_found: "12 terms found",
            // Terms / Privacy
            terms_title: "Terms of Service",
            privacy_title: "Privacy Policy",
            // Processing
            proc_uploading: "Uploading Document...",
            proc_layout: "Analyzing Document layout...",
            proc_translating: "Translating document...",
            proc_simplifying: "Simplifying legal terms...",
            proc_audio: "Generating Audio Explanation...",
            proc_done: "All Done!",
            // Document Names
            doc_up: "Uttar Pradesh Scholarship (Pre-Matric)",
            doc_hostel: "Hostels Fee Structure",
            doc_semester: "Semester Exam Admit Card",
            doc_library: "Library No-Dues Form",
            doc_mess: "Mess Rebate Application",
            doc_bus: "College Bus Route Schedule"
        },
        hi: {
            app_title: "पहली बार",
            tagline: "कोई भी दस्तावेज़, अब आसान भाषा में",
            select_language: "अपनी भाषा चुनें",
            begin_button: "शुरू करें",
            // Login
            login_heading: "स्वागत है!",
            login_subheading: "दस्तावेज़ों तक पहुँचने के लिए साइन इन करें",
            phone_label: "फ़ोन नंबर",
            send_otp: "ओटीपी भेजें",
            or_google: "गूगल के साथ जारी रखें",
            otp_label: "ओटीपी / वन-टाइम पासवर्ड",
            resend_otp: "ओटीपी पुनः भेजें",
            agree_terms: "जारी रखकर, आप हमारी शर्तों और गोपनीयता नीति से सहमत होते हैं",
            safe_data: "आपका डेटा सुरक्षित है",
            // Dashboard
            greeting_morning: "नमस्ते, आर्यन 👋",
            greeting_afternoon: "नमस्ते, आर्यन 👋",
            greeting_evening: "शुभ संध्या, आर्यन 👋",
            greeting_sub: "पहली बार में आपका स्वागत है",
            upload_title: "दस्तावेज़ की फ़ोटो लें",
            upload_desc: "अनुवाद और समझने के लिए दस्तावेज़ की फोटो लें",
            camera: "कैमरा",
            gallery: "गैलरी",
            pdf: "पीडीएफ",
            categories_all: "सभी",
            categories_scholarship: "छात्रवृत्ति",
            categories_fee: "फीस",
            categories_hostel: "छात्रावास",
            categories_admit: "प्रवेश पत्र",
            categories_notice: "सूचना",
            documents_count: "6 दस्तावेज़",
            recent_first: "नवीनतम पहले",
            // Sidebar / Nav
            nav_home: "मुख्य पृष्ठ",
            nav_docs: "दस्तावेज़",
            nav_glossary: "शब्दावली",
            nav_support: "सहायता",
            nav_upload: "दस्तावेज़ अपलोड करें",
            change_language: "भाषा बदलें",
            // Detail
            listen: "सुनें",
            share: "शेयर करें",
            save: "सहेजें",
            tldr_title: "सबसे ज़रूरी बात",
            tldr_content: "आपको 15 जुलाई से पहले ₹45,000 की फीस जमा करनी है। इसके लिए आपके पास आय प्रमाण पत्र और आधार कार्ड का होना अनिवार्य है।",
            fee_amount: "फीस राशि",
            last_date: "अंतिम तिथि",
            account_no: "खाता संख्या",
            next_steps: "अगले कदम",
            english_phrases: "अंग्रेजी वाक्यांश",
            original_label: "मूल पाठ:",
            step_1_text: "अपना 'Income Certificate' (आय प्रमाण पत्र) तैयार रखें।",
            step_2_text: "वेबसाइट पर 'Registration' बटन पर क्लिक करें।",
            step_3_text: "दस्तावेज़ों को 'Upload' करने के बाद 'Final Submit' करें।",
            checklist_title: "चेकलिस्ट और समय सीमा",
            chk_aadhaar: "आधार कार्ड लिंक करें",
            chk_bank: "बैंक खाता सत्यापित करें",
            days_left_3: "3 दिन बचे हैं",
            days_left_7: "7 दिन बचे हैं",
            chk_passbook: "बैंक पासबुक की फोटोकॉपी",
            days_left_12: "12 दिन बचे हैं",
            chk_bonafide: "कॉलेज से बोनाफाइड लेटर",
            days_left_25: "25 दिन बचे हैं",
            difficult_words_title: "मुश्किल शब्दों का मतलब",
            glossary_scholarship_desc: "इसे हिंदी में <strong class=\"text-on-surface\">छात्रवृत्ति</strong> कहते हैं। यह वह आर्थिक मदद है जो सरकार या संस्था आपको पढ़ाई के लिए देती है।",
            glossary_eligibility_desc: "इसका मतलब है <strong class=\"text-on-surface\">पात्रता</strong>। यानी वह शर्तें जो आपको इस योजना का लाभ उठाने के लिए पूरी करनी होंगी।",
            glossary_mandatory_desc: "इसका मतलब है <strong class=\"text-on-surface\">अनिवार्य</strong>। यानी वह काम जो आपको हर हाल में करना ही होगा, इसके बिना काम नहीं चलेगा।",
            // Support
            support_title: "सहायता और मदद",
            support_desc: "हम आपके कॉलेज के सफर को आसान बनाने के लिए यहां हैं",
            chat_ai: "एआई सहायक के साथ चैट करें",
            call_help: "सहायता डेस्क को कॉल करें",
            faq_title: "अक्सर पूछे जाने वाले प्रश्न",
            faq_1_q: "पहली बार कैसे काम करता है?",
            faq_1_a: "बस किसी भी कॉलेज दस्तावेज़ की एक तस्वीर लें। हमारा एआई इसका आपकी स्थानीय भाषा में अनुवाद करता है, कठिन शब्दों को समझाता है, और एक ऑडियो सारांश प्रदान करता है।",
            faq_2_q: "क्या मेरा डेटा सुरक्षित है?",
            faq_2_a: "हाँ। सभी अपलोड किए गए दस्तावेज़ सुरक्षित रूप से संसाधित किए जाते हैं और विश्लेषण के तुरंत बाद हमारे सर्वर से हटा दिए जाते हैं। आपका डेटा निजी है।",
            faq_3_q: "कौन सी भाषाएं समर्थित हैं?",
            faq_3_a: "हम वर्तमान में हिंदी, मराठी, तमिल, बंगाली, तेलुगु और अंग्रेजी का समर्थन करते हैं।",
            // Glossary
            glossary_title: "शब्दावली / शब्दकोश",
            search_glossary_placeholder: "शब्दावली शब्द खोजें...",
            search_docs_placeholder: "दस्तावेज़ खोजें...",
            terms_found: "12 शब्द मिले",
            // Terms / Privacy
            terms_title: "सेवा की शर्तें",
            privacy_title: "गोपनीयता नीति",
            // Processing
            proc_uploading: "दस्तावेज़ अपलोड हो रहा है...",
            proc_layout: "दस्तावेज़ लेआउट का विश्लेषण...",
            proc_translating: "हिंदी में अनुवाद किया जा रहा है...",
            proc_simplifying: "कठिन शब्दों को सरल बनाया जा रहा है...",
            proc_audio: "ऑडियो स्पष्टीकरण तैयार किया जा रहा है...",
            proc_done: "सब पूरा हो गया!",
            // Document Names
            doc_up: "उत्तर प्रदेश स्कॉलरशिप (प्री-मैट्रिक)",
            doc_hostel: "छात्रावास शुल्क संरचना",
            doc_semester: "सेमेस्टर परीक्षा प्रवेश पत्र",
            doc_library: "पुस्तकालय नो-ड्यूज फॉर्म",
            doc_mess: "मेस छूट आवेदन",
            doc_bus: "कॉलेज बस रूट शेड्यूल"
        },
        mr: {
            app_title: "पहिल्यांदाच",
            tagline: "कोणताही दस्तऐवज, आता सोप्या भाषेत",
            select_language: "तुमची भाषा निवडा",
            begin_button: "सुरू करूया",
            // Login
            login_heading: "स्वागत आहे!",
            login_subheading: "दस्तऐवजांमध्ये प्रवेश करण्यासाठी साइन इन करा",
            phone_label: "फोन नंबर",
            send_otp: "ओटीपी पाठवा",
            or_google: "गुगलसह सुरू ठेवा",
            otp_label: "ओटीपी / वन-टाइम पासवर्ड",
            resend_otp: "ओटीपी पुन्हा पाठवा",
            agree_terms: "सुरू ठेवून, आपण आमच्या अटी आणि गोपनीयता धोरणाशी सहमत आहात",
            safe_data: "आपला डेटा सुरक्षित आहे",
            // Dashboard
            greeting_morning: "शुभ प्रभात, आर्यन 👋",
            greeting_afternoon: "शुभ दुपार, आर्यन 👋",
            greeting_evening: "शुभ संध्याकाळ, आर्यन 👋",
            greeting_sub: "पहिल्यांदाच मध्ये आपले स्वागत आहे",
            upload_title: "दस्तऐवजाचा फोटो घ्या",
            upload_desc: "भाषांतर आणि समजून घेण्यासाठी दस्तऐवजाचा फोटो घ्या",
            camera: "कॅमेरा",
            gallery: "गॅलरी",
            pdf: "पीडीएफ",
            categories_all: "सर्व",
            categories_scholarship: "शिष्यवृत्ती",
            categories_fee: "फी",
            categories_hostel: "वसतिगृह",
            categories_admit: "प्रवेशपत्र",
            categories_notice: "सूचना",
            documents_count: "6 दस्तऐवज",
            recent_first: "नवीनतम आधी",
            // Sidebar / Nav
            nav_home: "मुख्य पृष्ठ",
            nav_docs: "दस्तऐवज",
            nav_glossary: "शब्दसंग्रह",
            nav_support: "मदत",
            nav_upload: "दस्तऐवज अपलोड करा",
            change_language: "भाषा बदला",
            // Detail
            listen: "ऐका",
            share: "शेअर करा",
            save: "जतन करा",
            tldr_title: "सर्वात महत्त्वाची गोष्ट",
            tldr_content: "तुम्हाला 15 जुलैपूर्वी ₹45,000 फी भरायची आहे. यासाठी तुमच्याकडे उत्पन्न प्रमाणपत्र आणि आधार कार्ड असणे अनिवार्य आहे.",
            fee_amount: "फी रक्कम",
            last_date: "अंतिम तारीख",
            account_no: "खाते क्रमांक",
            next_steps: "पुढील पावले",
            english_phrases: "इंग्रजी वाक्ये",
            original_label: "मूळ मजकूर:",
            step_1_text: "तुमचे 'Income Certificate' (उत्पन्न प्रमाणपत्र) तयार ठेवा.",
            step_2_text: "वेबसाइटवरील 'Registration' बटणावर क्लिक करा.",
            step_3_text: "दस्तऐवज अपलोड केल्यानंतर 'Final Submit' करा.",
            checklist_title: "चेकलिस्ट आणि अंतिम मुदत",
            chk_aadhaar: "आधार कार्ड लिंक करा",
            chk_bank: "बँक खाते सत्यापित करा",
            days_left_3: "3 दिवस शिल्लक",
            days_left_7: "7 दिवस शिल्लक",
            chk_passbook: "बँक पासबुकची छायाप्रत",
            days_left_12: "12 दिवस शिल्लक",
            chk_bonafide: "कॉलेजकडून बोनाफाइड प्रमाणपत्र",
            days_left_25: "25 दिवस शिल्लक",
            difficult_words_title: "कठीण शब्दांचे अर्थ",
            glossary_scholarship_desc: "याला मराठीत <strong class=\"text-on-surface\">शिष्यवृत्ती</strong> म्हणतात. सरकार किंवा संस्थेने तुम्हाला शिक्षणासाठी दिलेली ही आर्थिक मदत आहे.",
            glossary_eligibility_desc: "याचा अर्थ <strong class=\"text-on-surface\">पात्रता</strong> असा आहे. म्हणजेच या योजनेचा लाभ घेण्यासाठी तुम्हाला पूर्ण कराव्या लागणाऱ्या अटी.",
            glossary_mandatory_desc: "याचा अर्थ <strong class=\"text-on-surface\">अनिवार्य</strong> असा आहे. म्हणजेच जे काम तुम्हाला करावेच लागेल, त्याशिवाय चालणार नाही.",
            // Support
            support_title: "मदत आणि सहाय्य",
            support_desc: "आम्ही आपल्या कॉलेजचा प्रवास सोपा करण्यासाठी येथे आहोत",
            chat_ai: "एआय सहाय्यकाशी गप्पा मारा",
            call_help: "मदत केंद्राला कॉल करा",
            faq_title: "वारंवार विचारले जाणारे प्रश्न",
            faq_1_q: "पहिल्यांदाच कसे कार्य करते?",
            faq_1_a: "फक्त कोणत्याही कॉलेज दस्तऐवजाचा फोटो घ्या. आमचे एआय त्याचे तुमच्या स्थानिक भाषेत भाषांतर करते, कठीण शब्द स्पष्ट करते आणि ऑडिओ सारांश देते.",
            faq_2_q: "माझा डेटा सुरक्षित आहे का?",
            faq_2_a: "होय. सर्व अपलोड केलेले दस्तऐवज सुरक्षितपणे प्रक्रिया केले जातात आणि विश्लेषणानंतर लगेचच आमच्या सर्व्हरवरून हटवले जातात.",
            faq_3_q: "कोणत्या भाषा समर्थित आहेत?",
            faq_3_a: "आम्ही सध्या हिंदी, मराठी, तमिळ, बंगाली, तेलगू आणि इंग्रजीचे समर्थन करतो.",
            // Glossary
            glossary_title: "शब्दसंग्रह / शब्दकोश",
            search_glossary_placeholder: "शब्दसंग्रह शोधा...",
            search_docs_placeholder: "दस्तऐवज शोधा...",
            terms_found: "12 शब्द सापडले",
            // Terms / Privacy
            terms_title: "सेवा अटी",
            privacy_title: "गोपनीयता धोरण",
            // Processing
            proc_uploading: "दस्तऐवज अपलोड होत आहे...",
            proc_layout: "दस्तऐवज लेआउटचे विश्लेषण...",
            proc_translating: "मराठीत भाषांतर करत आहे...",
            proc_simplifying: "कठीण शब्द सोपे करत आहे...",
            proc_audio: "ऑडिओ स्पष्टीकरण तयार करत आहे...",
            proc_done: "सर्व पूर्ण झाले!",
            // Document Names
            doc_up: "उत्तर प्रदेश शिष्यवृत्ती (प्री-मॅट्रिक)",
            doc_hostel: "वसतिगृह शुल्क रचना",
            doc_semester: "सेमेस्टर परीक्षा प्रवेशपत्र",
            doc_library: "ग्रंथालय ना-हरकत फॉर्म",
            doc_mess: "मेस सवलत अर्ज",
            doc_bus: "कॉलेज बस मार्ग वेळापत्रक"
        },
        ta: {
            app_title: "முதல் முறை",
            tagline: "எந்த ஆவணமும், இப்போது எளிய மொழியில்",
            select_language: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்",
            begin_button: "தொடங்குவோம்",
            // Login
            login_heading: "வரவேற்கிறோம்!",
            login_subheading: "உங்கள் ஆவணங்களை அணுக உள்நுழையவும்",
            phone_label: "தொலைபேசி எண்",
            send_otp: "ஓடிபி அனுப்பவும்",
            or_google: "கூகுள் மூலம் தொடரவும்",
            otp_label: "ஓடிபி / ஒன்-டைம் பாஸ்வேர்ட்",
            resend_otp: "ஓடிபி மீண்டும் அனுப்பவும்",
            agree_terms: "தொடர்வதன் மூலம், எங்கள் விதிமுறைகள் மற்றும் தனியுரிமைக் கொள்கையை நீங்கள் ஒப்புக்கொள்கிறீர்கள்",
            safe_data: "உங்கள் தரவு பாதுகாப்பானது",
            // Dashboard
            greeting_morning: "காலை வணக்கம், ஆர்யன் 👋",
            greeting_afternoon: "மதிய வணக்கம், ஆர்யன் 👋",
            greeting_evening: "மாலை வணக்கம், ஆர்யன் 👋",
            greeting_sub: "முதல் முறை-க்கு வரவேற்கிறோம்",
            upload_title: "ஆவணத்தை புகைப்படம் எடுக்கவும்",
            upload_desc: "மொழிபெயர்க்க மற்றும் புரிந்து கொள்ள உங்கள் ஆவணத்தை புகைப்படம் எடுக்கவும்",
            camera: "கேமரா",
            gallery: "கேலரி",
            pdf: "பிடிஎஃப்",
            categories_all: "அனைத்தும்",
            categories_scholarship: "உதவித்தொகை",
            categories_fee: "கட்டணம்",
            categories_hostel: "விடுதி",
            categories_admit: "நுழைவுச் சீட்டு",
            categories_notice: "அறிவிப்பு",
            documents_count: "6 ஆவணங்கள்",
            recent_first: "சமீபத்தியவை முதலில்",
            // Sidebar / Nav
            nav_home: "முகப்பு",
            nav_docs: "ஆவணங்கள்",
            nav_glossary: "சொற்களஞ்சியம்",
            nav_support: "உதவி",
            nav_upload: "ஆவணத்தை பதிவேற்றவும்",
            change_language: "மொழியை மாற்றவும்",
            // Detail
            listen: "கேளுங்கள்",
            share: "பகிரவும்",
            save: "சேமிக்கவும்",
            tldr_title: "மிக முக்கியமான விஷயம்",
            tldr_content: "ஜூலை 15 ஆம் தேதிக்குள் ₹45,000 கட்டணத்தை செலுத்த வேண்டும். இதற்கு உங்களிடம் வருமான சான்றிதழ் மற்றும் ஆதார் அட்டை இருப்பது கட்டாயமாகும்.",
            fee_amount: "கட்டணத் தொகை",
            last_date: "கடைசி தேதி",
            account_no: "கணக்கு எண்",
            next_steps: "அடுத்த கட்டங்கள்",
            english_phrases: "ஆங்கில சொற்றொடர்கள்",
            original_label: "அசல் உரை:",
            step_1_text: "உங்கள் 'Income Certificate' (வருமான சான்றிதழ்) தயாராக வைத்திருக்கவும்.",
            step_2_text: "இணையதளத்தில் 'Registration' பொத்தானைக் கிளிக் செய்யவும்.",
            step_3_text: "ஆவணங்களைப் பதிவேற்றிய பின் 'Final Submit' செய்யவும்.",
            checklist_title: "சரிபார்ப்பு பட்டியல் மற்றும் காலக்கெடு",
            chk_aadhaar: "ஆதார் கார்டை இணைக்கவும்",
            chk_bank: "வங்கி கணக்கை சரிபார்க்கவும்",
            days_left_3: "3 நாட்கள் உள்ளன",
            days_left_7: "7 நாட்கள் உள்ளன",
            chk_passbook: "வங்கி கணக்கு புத்தகத்தின் நகல்",
            days_left_12: "12 நாட்கள் உள்ளன",
            chk_bonafide: "கல்லூரியிலிருந்து போனாஃபைட் கடிதம்",
            days_left_25: "25 நாட்கள் உள்ளன",
            difficult_words_title: "கடினமான சொற்களின் விளக்கம்",
            glossary_scholarship_desc: "இதனைத் தமிழில் <strong class=\"text-on-surface\">கல்வி உதவித்தொகை</strong> என்பர். நீங்கள் படிக்க அரசு அல்லது அமைப்புகள் வழங்கும் நிதி உதவி இது.",
            glossary_eligibility_desc: "இதன் பொருள் <strong class=\"text-on-surface\">தகுதி</strong>. இந்தத் திட்டத்தின் பலனைப் பெற நீங்கள் பூர்த்தி செய்ய வேண்டிய நிபந்தனைகள்.",
            glossary_mandatory_desc: "இதன் பொருள் <strong class=\"text-on-surface\">கட்டாயம்</strong>. நீங்கள் கண்டிப்பாக செய்ய வேண்டிய ஒன்று.",
            // Support
            support_title: "ஆதரவு மற்றும் உதவி",
            support_desc: "உங்கள் கல்லூரி பயணத்தை எளிதாக்க நாங்கள் இங்கு இருக்கிறோம்",
            chat_ai: "AI உதவியாளருடன் அரட்டையடிக்கவும்",
            call_help: "ஆதரவு மையத்தை அழைக்கவும்",
            faq_title: "அடிக்கடி கேட்கப்படும் கேள்விகள்",
            faq_1_q: "முதல் முறை எவ்வாறு இயங்குகிறது?",
            faq_1_a: "ஏதேனும் ஒரு கல்லூரி ஆவணத்தை புகைப்படம் எடுங்கள். எங்கள் AI அதை உங்கள் உள்ளூர் மொழியில் மொழிபெயர்த்து, கடினமான சொற்களை விளக்கி, ஆடியோ சுருக்கத்தை வழங்குகிறது.",
            faq_2_q: "எனது தரவு பாதுகாப்பானதா?",
            faq_2_a: "ஆம். பதிவேற்றப்பட்ட அனைத்து ஆவணங்களும் பாதுகாப்பாக செயலாக்கப்பட்டு, பகுப்பாய்வு முடிந்ததும் உடனடியாக நீக்கப்படும்.",
            faq_3_q: "என்ன மொழிகள் ஆதரிக்கப்படுகின்றன?",
            faq_3_a: "நாங்கள் தற்போது இந்தி, மராத்தி, தமிழ், பெங்காலி, தெலுங்கு மற்றும் ஆங்கிலத்தை ஆதரிக்கிறோம்.",
            // Glossary
            glossary_title: "சொற்களஞ்சியம் / அகராதி",
            search_glossary_placeholder: "சொற்களஞ்சியத்தைத் தேடுங்கள்...",
            search_docs_placeholder: "ஆவணங்களைத் தேடுங்கள்...",
            terms_found: "12 சொற்கள் காணப்பட்டன",
            // Terms / Privacy
            terms_title: "சேவை விதிமுறைகள்",
            privacy_title: "தனியுரிமைக் கொள்கை",
            // Processing
            proc_uploading: "ஆவணம் பதிவேற்றப்படுகிறது...",
            proc_layout: "ஆவண தளவமைப்பு பகுப்பாய்வு செய்யப்படுகிறது...",
            proc_translating: "தமிழில் மொழிபெயர்க்கப்படுகிறது...",
            proc_simplifying: "கடினமான சொற்கள் எளிமையாக்கப்படுகின்றன...",
            proc_audio: "ஆடியோ விளக்கம் உருவாக்கப்படுகிறது...",
            proc_done: "அனைத்தும் முடிந்தது!",
            // Document Names
            doc_up: "உத்தரபிரதேச உதவித்தொகை (முன் மெட்ரிக்)",
            doc_hostel: "விடுதி கட்டண விவரம்",
            doc_semester: "செமஸ்டர் தேர்வு நுழைவுச் சீட்டு",
            doc_library: "நூலக பாக்கி இல்லாத சான்றிதழ் படிவம்",
            doc_mess: "மெஸ் கட்டண சலுகை விண்ணப்பம்",
            doc_bus: "கல்லூரி பேருந்து வழித்தட அட்டவணை"
        },
        bn: {
            app_title: "প্রথমবার",
            tagline: "যে কোনো নথি, এখন সহজ ভাষায়",
            select_language: "আপনার ভাষা চয়ন করুন",
            begin_button: "চলুন শুরু করি",
            // Login
            login_heading: "স্বাগত!",
            login_subheading: "নথিপত্র অ্যাক্সেস করতে সাইন ইন করুন",
            phone_label: "ফোন নম্বর",
            send_otp: "ওটিপি পাঠান",
            or_google: "গুগল দিয়ে চালিয়ে যান",
            otp_label: "ওটিপি / ওয়ান-টাইম পাসওয়ার্ড",
            resend_otp: "ওটিপি পুনরায় পাঠান",
            agree_terms: "চালিয়ে যাওয়ার মাধ্যমে, আপনি আমাদের শর্তাবলী এবং গোপনীয়তা নীতিতে সম্মত হচ্ছেন",
            safe_data: "আপনার ডেটা সুরক্ষিত আছে",
            // Dashboard
            greeting_morning: "শুভ সকাল, আরিয়ান 👋",
            greeting_afternoon: "শুভ দুপুর, আরিয়ান 👋",
            greeting_evening: "শুভ সন্ধ্যা, আরিয়ান 👋",
            greeting_sub: "প্রথমবার-এ আপনাকে স্বাগত",
            upload_title: "নথির ছবি তুলুন",
            upload_desc: "অনুবাদ এবং বোঝার জন্য নথির ছবি তুলুন",
            camera: "ক্যামেরা",
            gallery: "গ্যালারি",
            pdf: "পিডিএফ",
            categories_all: "সব",
            categories_scholarship: "বৃত্তি",
            categories_fee: "ফি",
            categories_hostel: "ছাত্রাবাস",
            categories_admit: "প্রবেশপত্র",
            categories_notice: "বিজ্ঞপ্তি",
            documents_count: "৬টি নথি",
            recent_first: "সাম্প্রতিক আগে",
            // Sidebar / Nav
            nav_home: "হোম",
            nav_docs: "নথিপত্র",
            nav_glossary: "শব্দকোষ",
            nav_support: "সহায়তা",
            nav_upload: "নথি আপলোড করুন",
            change_language: "ভাষা পরিবর্তন করুন",
            // Detail
            listen: "শুনুন",
            share: "শেয়ার করুন",
            save: "সংরক্ষণ করুন",
            tldr_title: "সবচেয়ে গুরুত্বপূর্ণ বিষয়",
            tldr_content: "আপনাকে ১৫ জুলাইয়ের আগে ₹৪৫,০০০ ফি জমা দিতে হবে। এর জন্য আপনার কাছে আয় শংসাপত্র এবং আধার কার্ড থাকা বাধ্যতামূলক।",
            fee_amount: "ফি এর পরিমাণ",
            last_date: "শেষ তারিখ",
            account_no: "অ্যাকাউন্ট নম্বর",
            next_steps: "পরবর্তী পদক্ষেপ",
            english_phrases: "ইংরেজি বাক্যাংশ",
            original_label: "মূল পাঠ:",
            step_1_text: "আপনার 'Income Certificate' (আয় শংসাপত্র) প্রস্তুত রাখুন।",
            step_2_text: "ওয়েবসাইটে 'Registration' বোতামে ক্লিক করুন।",
            step_3_text: "নথিপত্র আপলোড করার পর 'Final Submit' করুন।",
            checklist_title: "চেকলিস্ট এবং সময়সীমা",
            chk_aadhaar: "আধার কার্ড লিঙ্ক করুন",
            chk_bank: "ব্যাংক অ্যাকাউন্ট যাচাই করুন",
            days_left_3: "৩ দিন বাকি",
            days_left_7: "৭ দিন বাকি",
            chk_passbook: "ব্যাংক পাসবুকের ফটোকপি",
            days_left_12: "১২ দিন বাকি",
            chk_bonafide: "কলেজ থেকে বোনাফাইড শংসাপত্র",
            days_left_25: "২৫ দিন বাকি",
            difficult_words_title: "কঠিন শব্দ ও তাদের অর্থ",
            glossary_scholarship_desc: "একে বাংলায় <strong class=\"text-on-surface\">বৃত্তি</strong> বলে। পড়াশোনার সহায়তার জন্য এটি সরকার বা সংস্থার পক্ষ থেকে দেওয়া একটি সাহায্য।",
            glossary_eligibility_desc: "এর অর্থ হলো <strong class=\"text-on-surface\">যোগ্যতা</strong>। এই সুবিধার জন্য আপনাকে যেসব শর্তাবলি পূরণ করতে হবে।",
            glossary_mandatory_desc: "এর অর্থ হলো <strong class=\"text-on-surface\">বাধ্যতামূলক</strong>। যা আপনাকে অবশ্যই করতে হবে।",
            // Support
            support_title: "সহায়তা ও সাহায্য",
            support_desc: "আমরা আপনার কলেজ যাত্রা সহজ করতে এখানে আছি",
            chat_ai: "এআই সহকারীর সাথে চ্যাট করুন",
            call_help: "হেল্পডেস্কে কল করুন",
            faq_title: "প্রায়শই জিজ্ঞাসিত প্রশ্নাবলী",
            faq_1_q: "প্রথমবার কীভাবে কাজ করে?",
            faq_1_a: "যেকোনো কলেজ নথির ছবি তুলুন। আমাদের এআই এটি আপনার স্থানীয় ভাষায় অনুবাদ করে, কঠিন শব্দগুলি ব্যাখ্যা করে এবং অডিও সারাংশ প্রদান করে।",
            faq_2_q: "আমার ডেটা কি নিরাপদ?",
            faq_2_a: "হ্যাঁ। সমস্ত আপলোড করা নথি সুরক্ষিতভাবে প্রক্রিয়া করা হয় এবং বিশ্লেষণের পরপরই আমাদের সার্ভার থেকে মুছে ফেলা হয়।",
            faq_3_q: "কোন কোন ভাষা সমর্থিত?",
            faq_3_a: "আমরা বর্তমানে হিন্দি, মারাঠি, তামিল, বাংলা, তেলুগু এবং ইংরেজি সমর্থন করি।",
            // Glossary
            glossary_title: "শব্দকোষ / অভিধান",
            search_glossary_placeholder: "শব্দকোষ খুঁজুন...",
            search_docs_placeholder: "নথিপত্র খুঁজুন...",
            terms_found: "১২টি শব্দ পাওয়া গেছে",
            // Terms / Privacy
            terms_title: "পরিষেবার শর্তাবলী",
            privacy_title: "গোপনীয়তা নীতি",
            // Processing
            proc_uploading: "নথি আপলোড হচ্ছে...",
            proc_layout: "নথির লেআউট বিশ্লেষণ করা হচ্ছে...",
            proc_translating: "বাংলায় অনুবাদ করা হচ্ছে...",
            proc_simplifying: "কঠিন শব্দগুলি সহজ করা হচ্ছে...",
            proc_audio: "অডিও ব্যাখ্যা তৈরি করা হচ্ছে...",
            proc_done: "সব সম্পন্ন হয়েছে!",
            // Document Names
            doc_up: "উত্তর প্রদেশ বৃত্তি (প্রাক-মেট্রিক)",
            doc_hostel: "ছাত্রাবাস ফি কাঠামো",
            doc_semester: "সেমিস্টার পরীক্ষার প্রবেশপত্র",
            doc_library: "গ্রন্থাগার নো-ডিউজ ফর্ম",
            doc_mess: "মেস রিবেট আবেদন",
            doc_bus: "কলেজ বাস রুট সূচী"
        },
        te: {
            app_title: "మొదటి సారి",
            tagline: "ఏ పత్రమైనా, ఇప్పుడు సరళమైన భాషలో",
            select_language: "మీ భాషను ఎంచుకోండి",
            begin_button: "ప్రారంభిద్దాం",
            // Login
            login_heading: "స్వాగతం!",
            login_subheading: "మీ పత్రాలను యాక్సెస్ చేయడానికి సైన్ ఇన్ చేయండి",
            phone_label: "ఫోన్ నంబర్",
            send_otp: "ఓటీపీ పంపండి",
            or_google: "గూగుల్‌తో కొనసాగండి",
            otp_label: "ఓటీపీ / వన్-టైమ్ పాస్‌వర్డ్",
            resend_otp: "ఓటీపీ మళ్లీ పంపండి",
            agree_terms: "కొనసాగడం ద్వారా, మీరు మా నిబంధనలు మరియు గోప్యతా విధానానికి అంగీకరిస్తున్నారు",
            safe_data: "మీ డేటా సురక్షితం",
            // Dashboard
            greeting_morning: "శుభోదయం, ఆర్యన్ 👋",
            greeting_afternoon: "శుభ మధ్యాహ్నం, ఆర్యన్ 👋",
            greeting_evening: "శుభ సాయంత్రం, ఆర్యన్ 👋",
            greeting_sub: "మొదటి సారి కి స్వాగతం",
            upload_title: "పత్రం ఫోటో తీయండి",
            upload_desc: "అనువదించడానికి మరియు అర్థం చేసుకోవడానికి మీ పత్రాన్ని ఫోటో తీయండి",
            camera: "కెమెరా",
            gallery: "గ్యాలరీ",
            pdf: "పీడీఎఫ్",
            categories_all: "అన్నీ",
            categories_scholarship: "స్కాలర్‌షిప్",
            categories_fee: "ఫీజు",
            categories_hostel: "హాస్టల్",
            categories_admit: "హాల్ టికెట్",
            categories_notice: "సమాచారం",
            documents_count: "6 పత్రాలు",
            recent_first: "ఇటీవలివి మొదట",
            // Sidebar / Nav
            nav_home: "హోమ్",
            nav_docs: "పత్రాలు",
            nav_glossary: "పదకోశం",
            nav_support: "సహాయం",
            nav_upload: "పత్రాన్ని అప్‌లోడ్ చేయండి",
            change_language: "భాషను మార్చండి",
            // Detail
            listen: "వినండి",
            share: "షేర్ చేయండి",
            save: "సేవ్ చేయండి",
            tldr_title: "అత్యంత ముఖ్యమైన విషయం",
            tldr_content: "మీరు జూలై 15 లోపు ₹45,000 ఫీజు చెల్లించాలి. దీని కోసం మీ వద్ద ఆదాయ ధృవీకరణ పత్రం మరియు ఆధార్ కార్డ్ ఉండటం తప్పనిసరి.",
            fee_amount: "ఫీజు మొత్తం",
            last_date: "చివరి తేదీ",
            account_no: "ఖాతా సంఖ్య",
            next_steps: "తదుపరి దశలు",
            english_phrases: "ఇంగ్లీష్ పదబంధాలు",
            original_label: "మూల పాఠం:",
            step_1_text: "మీ 'Income Certificate' (ఆదాయ ధృవీకరణ పత్రం) సిద్ధంగా ఉంచుకోండి.",
            step_2_text: "వెబ్‌సైట్‌లో 'Registration' బటన్‌పై క్లిక్ చేయండి.",
            step_3_text: "పత్రాలను అప్‌లోడ్ చేసిన తర్వాత 'Final Submit' చేయండి.",
            checklist_title: "చెక్‌లిస్ట్ మరియు గడువు",
            chk_aadhaar: "ఆధార్ కార్డ్‌ని లింక్ చేయండి",
            chk_bank: "బ్యాంక్ ఖాతాను ధృవీకరించండి",
            days_left_3: "3 రోజులు మిగిలి ఉన్నాయి",
            days_left_7: "7 రోజులు మిగిలి ఉన్నాయి",
            chk_passbook: "బ్యాంక్ పాస్‌బుక్ ఫోటోకాపీ",
            days_left_12: "12 రోజులు మిగిలి ఉన్నాయి",
            chk_bonafide: "కళాశాల నుండి బోనఫైడ్ లెటర్",
            days_left_25: "25 రోజులు మిగిలి ఉన్నాయి",
            difficult_words_title: "కఠినమైన పదాల అర్థాలు",
            glossary_scholarship_desc: "దీన్ని తెలుగులో <strong class=\"text-on-surface\">స్కాలర్‌షిప్</strong> అంటారు. మీ చదువుకు సహాయపడేందుకు ప్రభుత్వం లేదా సంస్థలు ఇచ్చే ఆర్థిక సహాయం.",
            glossary_eligibility_desc: "దీని అర్థం <strong class=\"text-on-surface\">అర్హత</strong>. ఈ పథకం ప్రయోజనం పొందడానికి మీరు పూర్తి చేయాల్సిన నిబంధనలు.",
            glossary_mandatory_desc: "దీని అర్థం <strong class=\"text-on-surface\">తప్పనిసరి</strong>. నియమాల ప్రకారం మీరు ఖచ్చితంగా చేయాల్సిన పని.",
            // Support
            support_title: "మద్దతు మరియు సహాయం",
            support_desc: "మీ కాలేజీ ప్రయాణాన్ని సులభతరం చేయడానికి మేము ఇక్కడ ఉన్నాము",
            chat_ai: "AI అసిస్టెంట్‌తో చాట్ చేయండి",
            call_help: "సహాయ కేంద్రానికి కాల్ చేయండి",
            faq_title: "తరచుగా అడిగే ప్రశ్నలు",
            faq_1_q: "మొదటి సారి ఎలా పనిచేస్తుంది?",
            faq_1_a: "ఏదైనా కాలేజీ పత్రం ఫోటో తీయండి. మా AI దానిని మీ స్థానిక భాషలోకి అనువదిస్తుంది, కఠినమైన పదాలను వివరిస్తుంది మరియు ఆడియో సారాంశాన్ని అందిస్తుంది.",
            faq_2_q: "నా డేటా సురక్షితమేనా?",
            faq_2_a: "అవును. అప్‌లోడ్ చేసిన అన్ని పత్రాలు సురక్షితంగా ప్రాసెస్ చేయబడతాయి మరియు విశ్లేషణ తర్వాత వెంటనే మా సర్వర్‌ల నుండి తొలగించబడతాయి.",
            faq_3_q: "ఏ భాషలకు మద్దతు ఉంది?",
            faq_3_a: "మేము ప్రస్తుతం హిందీ, మరాఠీ, తమిళం, బెంగాలీ, తెలుగు మరియు ఇంగ్లీష్‌లకు మద్దతు ఇస్తున్నాము.",
            // Glossary
            glossary_title: "పదకోశం / నిఘంటువు",
            search_glossary_placeholder: "పదకోశాన్ని శోధించండి...",
            search_docs_placeholder: "పత్రాలను శోధించండి...",
            terms_found: "12 పదాలు కనుగొనబడ్డాయి",
            // Terms / Privacy
            terms_title: "సేవా నిబంధనలు",
            privacy_title: "గోప్యతా విధానం",
            // Processing
            proc_uploading: "పత్రం అప్‌లోడ్ అవుతోంది...",
            proc_layout: "పత్రం లేఅవుట్ విశ్లేషించబడుతోంది...",
            proc_translating: "తెలుగులోకి అనువదించబడుతోంది...",
            proc_simplifying: "కఠినమైన పదాలను సరళీకరిస్తోంది...",
            proc_audio: "ఆడియో వివరణను రూపొందిస్తోంది...",
            proc_done: "అన్నీ పూర్తయ్యాయి!",
            // Document Names
            doc_up: "ఉత్తర ప్రదేశ్ స్కాలర్‌షిప్ (ప్రీ-మెట్రిక్)",
            doc_hostel: "హాస్టల్ ఫీజు నిర్మాణం",
            doc_semester: "సెమిస్టర్ పరీక్ష హాల్ టికెట్",
            doc_library: "లైబ్రరీ నో-డ్యూస్ ఫారమ్",
            doc_mess: "మెస్ తగ్గింపు దరఖాస్తు",
            doc_bus: "కళాశాల బస్సు రూట్ షెడ్యూల్"
        }
    };

    function applyLanguage(langCode) {
        document.documentElement.lang = langCode;
        localStorage.setItem('preferredLanguage', langCode);

        // Update all standard translation selectors
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (translations[langCode] && translations[langCode][key]) {
                el.innerHTML = translations[langCode][key];
            }
        });

        // Update all input placeholder translation selectors
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            if (translations[langCode] && translations[langCode][key]) {
                el.placeholder = translations[langCode][key];
            }
        });

        // Specific dynamic logic
        updateGreeting();

        // Update audio player text according to selected language
        const audioDescText = document.querySelector('.waveform-bar')?.closest('.flex-grow')?.querySelector('p');
        if (audioDescText) {
            const voices = {
                hi: 'Hindi AI Voice',
                mr: 'Marathi AI Voice',
                ta: 'Tamil AI Voice',
                bn: 'Bengali AI Voice',
                te: 'Telugu AI Voice',
                en: 'English AI Voice'
            };
            const labels = {
                hi: 'विवरण सुनें',
                mr: 'तपशील ऐका',
                ta: 'விவரங்களைக் கேளுங்கள்',
                bn: 'বিস্তারিত শুনুন',
                te: 'వివరాలు వినండి',
                en: 'Listen to explanation'
            };
            audioDescText.textContent = `${labels[langCode] || labels.en} (${voices[langCode] || voices.en})`;
        }
    }

    // Toggle a floating language picker menu
    window.toggleLanguageMenu = function (event) {
        event.preventDefault();
        event.stopPropagation();
        let menu = document.getElementById('floating-lang-picker');
        if (menu) {
            menu.remove();
            return;
        }

        menu = document.createElement('div');
        menu.id = 'floating-lang-picker';
        menu.className = 'w-48 bg-surface-container-high border border-outline-variant rounded-xl shadow-lg py-2 z-50 animate-fade-in';
        
        const languages = [
            { code: 'hi', name: 'हिंदी (Hindi)' },
            { code: 'mr', name: 'मराठी (Marathi)' },
            { code: 'ta', name: 'தமிழ் (Tamil)' },
            { code: 'bn', name: 'বাংলা (Bengali)' },
            { code: 'te', name: 'తెలుగు (Telugu)' },
            { code: 'en', name: 'English (EN)' }
        ];

        const currentLangCode = localStorage.getItem('preferredLanguage') || 'hi';

        languages.forEach(lang => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left px-4 py-2 hover:bg-surface-container-highest transition-colors text-body-md font-body-md text-on-surface flex items-center justify-between';
            const activeSymbol = (currentLangCode === lang.code) ? '✓' : '';
            btn.innerHTML = `<span>${lang.name}</span><span class="text-primary font-bold">${activeSymbol}</span>`;
            btn.onclick = function () {
                const langMapToLabel = {
                    'hi': 'हिंदी',
                    'mr': 'मराठी',
                    'ta': 'தமிழ்',
                    'bn': 'বাংলা',
                    'te': 'తెలుగు',
                    'en': 'EN'
                };
                selectedLanguage = langMapToLabel[lang.code];
                applyLanguage(lang.code);
                syncOnboardingChips(lang.code);
                menu.remove();
            };
            menu.appendChild(btn);
        });

        // Position it relative to the clicked button
        const rect = event.currentTarget.getBoundingClientRect();
        menu.style.position = 'fixed';
        
        const menuHeight = 240; // approximate height
        let top = rect.bottom + 8;
        if (top + menuHeight > window.innerHeight) {
            top = Math.max(16, rect.top - menuHeight - 8);
        }
        menu.style.top = `${top}px`;
        menu.style.left = `${Math.max(16, Math.min(rect.left - 60, window.innerWidth - 208))}px`;
        
        document.body.appendChild(menu);

        // Close when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== event.currentTarget) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 50);
    };

    function syncOnboardingChips(langCode) {
        const langMapInverse = {
            'hi': 'हिंदी',
            'mr': 'मराठी',
            'ta': 'தமிழ்',
            'bn': 'বাংলা',
            'te': 'తెలుగు',
            'en': 'EN'
        };
        const targetLabel = langMapInverse[langCode];
        document.querySelectorAll('.lang-chip').forEach(btn => {
            const innerDiv = btn.querySelector('div');
            if (innerDiv.textContent.trim() === targetLabel) {
                innerDiv.classList.remove('bg-surface-container-lowest', 'border-outline-variant');
                innerDiv.classList.add('bg-primary-fixed', 'border-primary', 'ring-2', 'ring-primary', 'ring-offset-4');
            } else {
                innerDiv.classList.remove('bg-primary-fixed', 'border-primary', 'ring-2', 'ring-primary', 'ring-offset-4');
                innerDiv.classList.add('bg-surface-container-lowest', 'border-outline-variant');
            }
        });
    }

    // ── DOM References ───────────────────────────────
    const screens = {
        login: document.getElementById('screen-login'),
        onboarding: document.getElementById('screen-onboarding'),
        dashboard: document.getElementById('screen-dashboard'),
        processing: document.getElementById('screen-processing'),
        detail: document.getElementById('screen-detail'),
        documents: document.getElementById('screen-documents'),
        glossary: document.getElementById('screen-glossary'),
        support: document.getElementById('screen-support'),
        terms: document.getElementById('screen-terms'),
        privacy: document.getElementById('screen-privacy')
    };

    // ── Screen Navigation ────────────────────────────
    function navigateTo(screenName, direction = 'forward') {
        if (screenName === currentScreen) return;

        const currentEl = screens[currentScreen];
        const nextEl = screens[screenName];

        if (!currentEl || !nextEl) return;

        // Exit current screen
        currentEl.classList.remove('active');
        currentEl.classList.add(direction === 'forward' ? 'exit-up' : 'exit-down');

        // Enter next screen
        nextEl.classList.remove('exit-up', 'exit-down');
        nextEl.classList.add('active');

        // Clean up exit classes after transition
        setTimeout(() => {
            currentEl.classList.remove('exit-up', 'exit-down');
        }, 600);

        const previousScreen = currentScreen;
        currentScreen = screenName;

        // Screen-specific setup
        if (screenName === 'dashboard') {
            updateGreeting();
            resetDashboardAnimations();
        } else if (screenName === 'processing') {
            startProcessing();
        } else if (screenName === 'detail') {
            resetDetailAnimations();
            initAudioPlayer();
        }

        // Cleanup previous screen
        if (previousScreen === 'processing') {
            stopProcessing();
        }
    }

    // Make navigateTo available globally for inline onclick handlers
    window.navigateTo = navigateTo;

    // ── Onboarding: Language Selection ────────────────
    window.selectLang = function (btn) {
        // Remove active from all
        document.querySelectorAll('.lang-chip div').forEach(div => {
            div.classList.remove('bg-primary-fixed', 'border-primary', 'ring-2', 'ring-primary', 'ring-offset-4');
            div.classList.add('bg-surface-container-lowest', 'border-outline-variant');
        });

        // Activate selected
        const innerDiv = btn.querySelector('div');
        innerDiv.classList.remove('bg-surface-container-lowest', 'border-outline-variant');
        innerDiv.classList.add('bg-primary-fixed', 'border-primary', 'ring-2', 'ring-primary', 'ring-offset-4');

        selectedLanguage = innerDiv.textContent.trim();

        // Map selection to lang code and apply
        const langMap = {
            'हिंदी': 'hi',
            'मराठी': 'mr',
            'தமிழ்': 'ta',
            'বাংলা': 'bn',
            'తెలుగు': 'te',
            'EN': 'en'
        };
        const langCode = langMap[selectedLanguage] || 'en';
        applyLanguage(langCode);

        // Haptic-like animation
        btn.classList.add('scale-90');
        setTimeout(() => btn.classList.remove('scale-90'), 100);
    };


    // ── Login: Phone + OTP Flow ──────────────────────
    let loginState = 'phone'; // 'phone' | 'otp'
    const phoneInput = document.getElementById('login-phone');
    const otpSection = document.getElementById('otp-section');
    const btnSendOtp = document.getElementById('btn-send-otp');
    const btnOtpText = document.getElementById('btn-otp-text');
    const btnGoogleLogin = document.getElementById('btn-google-login');
    const btnResendOtp = document.getElementById('btn-resend-otp');
    const otpBoxes = document.querySelectorAll('.otp-box');

    // Validate phone number (Indian 10-digit)
    function isValidPhone(phone) {
        return /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''));
    }

    // Phone input: numbers only
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });

        phoneInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && loginState === 'phone') {
                btnSendOtp.click();
            }
        });
    }

    // Send OTP / Verify OTP button
    if (btnSendOtp) {
        btnSendOtp.addEventListener('click', () => {
            const nameInput = document.getElementById('login-name');
            const name = nameInput ? nameInput.value.trim() : '';

            if (loginState === 'phone') {
                // Validate name
                if (!name) {
                    if (nameInput) {
                        nameInput.closest('div').classList.add('shake');
                        setTimeout(() => nameInput.closest('div').classList.remove('shake'), 500);
                        nameInput.focus();
                    }
                    return;
                }

                // Validate phone
                const phone = phoneInput.value.trim();
                if (!isValidPhone(phone)) {
                    phoneInput.closest('div').classList.add('shake');
                    setTimeout(() => phoneInput.closest('div').classList.remove('shake'), 500);
                    phoneInput.focus();
                    return;
                }

                // Show loading state
                const icon = btnSendOtp.querySelector('.material-symbols-outlined');
                if (icon) icon.outerHTML = '<span class="btn-spinner"></span>';
                btnOtpText.textContent = 'Sending OTP...';
                btnSendOtp.disabled = true;
                btnSendOtp.classList.add('opacity-70');

                // Call backend API to send OTP
                fetch(`${API_BASE_URL}/api/auth/send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, name })
                })
                .then(res => {
                    if (!res.ok) throw new Error('Failed to send OTP');
                    return res.json();
                })
                .then((data) => {
                    loginState = 'otp';
                    btnSendOtp.disabled = false;
                    btnSendOtp.classList.remove('opacity-70');

                    // If OTP is returned in the payload (dev mode), alert or display it
                    if (data.otp) {
                        const isSimulated = !data.sent && (!data.error || data.error.includes("not configured"));
                        const errorMsg = data.error ? `<p class="text-xs text-error font-medium" style="color: #ba1a1a; margin-top: 4px;">Error details: ${data.error}</p>` : '';
                        
                        const alertBox = document.createElement('div');
                        alertBox.className = 'fixed bottom-4 right-4 z-50 bg-surface-container-lowest border border-outline-variant p-5 rounded-2xl shadow-2xl flex flex-col gap-2 text-on-surface-variant max-w-sm paper-shadow';
                        alertBox.innerHTML = `
                            <div class="flex items-center gap-2 text-primary font-bold">
                                <span class="material-symbols-outlined">${isSimulated ? 'key' : 'warning'}</span>
                                <span>${isSimulated ? 'SMS Sandbox Mode' : 'SMS Delivery Failed'}</span>
                            </div>
                            <p class="text-body-md font-body-md text-on-surface">OTP generated for testing: <strong class="text-lg text-primary font-mono select-all">${data.otp}</strong></p>
                            ${errorMsg}
                            <p class="text-xs text-outline mt-1">Configure Twilio credentials in Settings to send real SMS.</p>
                        `;
                        document.body.appendChild(alertBox);
                        setTimeout(() => alertBox.classList.add('opacity-0', 'transition-opacity', 'duration-500'), 8000);
                        setTimeout(() => alertBox.remove(), 8500);
                    }

                    // Restore button
                    const spinner = btnSendOtp.querySelector('.btn-spinner');
                    if (spinner) spinner.outerHTML = '<span class="material-symbols-outlined">verified</span>';
                    btnOtpText.textContent = 'Verify OTP / सत्यापित करें';

                    // Disable phone and name inputs
                    phoneInput.disabled = true;
                    phoneInput.classList.add('opacity-50');
                    if (nameInput) {
                        nameInput.disabled = true;
                        nameInput.classList.add('opacity-50');
                    }

                    // Show OTP section
                    otpSection.classList.remove('hidden');
                    otpSection.classList.add('show');

                    // Focus first OTP box
                    setTimeout(() => otpBoxes[0]?.focus(), 100);
                })
                .catch(err => {
                    console.error(err);
                    btnSendOtp.disabled = false;
                    btnSendOtp.classList.remove('opacity-70');
                    const spinner = btnSendOtp.querySelector('.btn-spinner');
                    if (spinner) spinner.outerHTML = '<span class="material-symbols-outlined">sms</span>';
                    btnOtpText.textContent = 'Error. Try Again.';
                });

            } else if (loginState === 'otp') {
                // Gather OTP
                let otp = '';
                otpBoxes.forEach(box => otp += box.value);

                if (otp.length < 6) {
                    document.getElementById('otp-inputs').classList.add('shake');
                    setTimeout(() => document.getElementById('otp-inputs').classList.remove('shake'), 500);
                    return;
                }

                // Show loading
                btnOtpText.textContent = 'Verifying...';
                btnSendOtp.disabled = true;
                btnSendOtp.classList.add('opacity-70');

                const phone = phoneInput.value.trim();

                // Call backend to verify OTP
                fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, otp, name })
                })
                .then(res => {
                    if (!res.ok) throw new Error('Incorrect OTP');
                    return res.json();
                })
                .then(data => {
                    // Save to local storage
                    localStorage.setItem('studentName', data.name);
                    localStorage.setItem('studentPhone', data.phone);
                    if (data.token) {
                        localStorage.setItem('authToken', data.token);
                    }
                    
                    // Update greeting elements dynamically
                    updateGreeting();

                    navigateTo('onboarding', 'forward');
                    resetLoginForm();
                })
                .catch(err => {
                    console.error(err);
                    btnSendOtp.disabled = false;
                    btnSendOtp.classList.remove('opacity-70');
                    btnOtpText.textContent = 'Verify OTP / सत्यापित करें';
                    
                    document.getElementById('otp-inputs').classList.add('shake');
                    setTimeout(() => document.getElementById('otp-inputs').classList.remove('shake'), 500);
                    
                    // Clear inputs
                    otpBoxes.forEach(box => {
                        box.value = '';
                        box.classList.remove('filled');
                    });
                    otpBoxes[0]?.focus();
                });
            }
        });
    }

    // OTP auto-advance: jump to next box on input
    otpBoxes.forEach((box, index) => {
        box.addEventListener('input', (e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = val;

            if (val) {
                e.target.classList.add('filled');
                // Auto-advance
                if (index < otpBoxes.length - 1) {
                    otpBoxes[index + 1].focus();
                } else {
                    // All filled — auto-submit
                    e.target.blur();
                    setTimeout(() => btnSendOtp.click(), 200);
                }
            } else {
                e.target.classList.remove('filled');
            }
        });

        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpBoxes[index - 1].focus();
                otpBoxes[index - 1].value = '';
                otpBoxes[index - 1].classList.remove('filled');
            }
        });

        // Paste support
        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
            pasted.split('').forEach((char, i) => {
                if (otpBoxes[i]) {
                    otpBoxes[i].value = char;
                    otpBoxes[i].classList.add('filled');
                }
            });
            if (pasted.length === 6) {
                setTimeout(() => btnSendOtp.click(), 200);
            } else if (pasted.length > 0) {
                otpBoxes[Math.min(pasted.length, 5)].focus();
            }
        });
    });

    // Google login click handler
    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', () => {
            if (googleClientId && googleTokenClient) {
                // Request Google Sign-in popup
                googleTokenClient.requestAccessToken();
            } else {
                // Open Sandbox custom popup modal
                const googleSandboxModal = document.getElementById('google-sandbox-modal');
                if (googleSandboxModal) {
                    googleSandboxModal.classList.remove('hidden');
                } else {
                    alert('Sandbox login modal missing.');
                }
            }
        });
    }

    function initGoogleSignIn() {
        if (!googleClientId || !window.google) return;
        try {
            googleTokenClient = google.accounts.oauth2.initTokenClient({
                client_id: googleClientId,
                scope: 'profile email',
                callback: async (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        await handleGoogleLogin(tokenResponse.access_token);
                    }
                }
            });
        } catch (err) {
            console.error('Error initializing Google Sign-In client:', err);
        }
    }

    async function handleGoogleLogin(accessToken) {
        const btnGoogleLogin = document.getElementById('btn-google-login');
        if (!btnGoogleLogin) return;

        // Show loading state
        btnGoogleLogin.classList.add('opacity-70');
        btnGoogleLogin.innerHTML = '<span class="btn-spinner" style="border-top-color: #a23900; border-color: rgba(162,57,0,0.2)"></span><span>Signing in...</span>';

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Verification failed');
            }

            const data = await res.json();
            
            // Save to local storage
            localStorage.setItem('studentName', data.name);
            if (data.email) {
                localStorage.setItem('studentEmail', data.email);
            }
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }
            
            updateGreeting();
            navigateTo('onboarding', 'forward');
        } catch (err) {
            console.error('Google Sign-In backend verification failed:', err);
            alert('गूगल लॉगइन विफल / Google Sign-In failed: ' + err.message);
        } finally {
            // Restore Google button style
            btnGoogleLogin.classList.remove('opacity-70');
            btnGoogleLogin.innerHTML = '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#34A853" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span>Continue with Google</span>';
        }
    }

    // Resend OTP
    if (btnResendOtp) {
        btnResendOtp.addEventListener('click', () => {
            btnResendOtp.textContent = 'Sending...';
            btnResendOtp.disabled = true;
            setTimeout(() => {
                btnResendOtp.textContent = 'Resend OTP';
                btnResendOtp.disabled = false;
                // Clear OTP boxes
                otpBoxes.forEach(box => {
                    box.value = '';
                    box.classList.remove('filled');
                });
                otpBoxes[0]?.focus();
            }, 1500);
        });
    }

    // Reset login form to initial state
    function resetLoginForm() {
        loginState = 'phone';
        if (phoneInput) {
            phoneInput.value = '';
            phoneInput.disabled = false;
            phoneInput.classList.remove('opacity-50');
        }
        const nameInput = document.getElementById('login-name');
        if (nameInput) {
            nameInput.value = '';
            nameInput.disabled = false;
            nameInput.classList.remove('opacity-50');
        }
        if (otpSection) {
            otpSection.classList.add('hidden');
            otpSection.classList.remove('show');
        }
        otpBoxes.forEach(box => {
            box.value = '';
            box.classList.remove('filled');
        });
        if (btnSendOtp) {
            btnSendOtp.disabled = false;
            btnSendOtp.classList.remove('opacity-70');
            const existingSpinner = btnSendOtp.querySelector('.btn-spinner');
            if (existingSpinner) existingSpinner.outerHTML = '<span class="material-symbols-outlined">sms</span>';
        }
        if (btnOtpText) btnOtpText.textContent = 'OTP भेजें / Send OTP';
    }


    // ── Onboarding: Begin Button ─────────────────────
    const btnBegin = document.getElementById('btn-begin');
    if (btnBegin) {
        btnBegin.addEventListener('click', () => {
            navigateTo('dashboard', 'forward');
        });
    }


    // ── Dashboard: Dynamic Greeting ──────────────────
    function updateGreeting() {
        const greetingEl = document.getElementById('greeting-text');
        if (!greetingEl) return;

        const langCode = localStorage.getItem('preferredLanguage') || 'hi';
        const hour = new Date().getHours();
        let greetingKey = 'greeting_evening';

        if (hour >= 5 && hour < 12) {
            greetingKey = 'greeting_morning';
        } else if (hour >= 12 && hour < 17) {
            greetingKey = 'greeting_afternoon';
        } else if (hour >= 17 && hour < 21) {
            greetingKey = 'greeting_evening';
        }

        const name = localStorage.getItem('studentName') || 'Aryan';

        let greetingText = translations[langCode][greetingKey] || translations.en[greetingKey];
        greetingText = greetingText
            .replace(/Aryan/g, name)
            .replace(/आर्यन/g, name)
            .replace(/आरियन/g, name)
            .replace(/शुभ प्रभात, आर्यन/g, `शुभ प्रभात, ${name}`)
            .replace(/காலை வணக்கம், ஆர்யன்/g, `காலை வணக்கம், ${name}`)
            .replace(/শুভ সকাল, আরিয়ান/g, `শুভ সকাল, ${name}`)
            .replace(/శుభోదయం, ఆర్యన్/g, `శుభోదయం, ${name}`);

        greetingEl.textContent = greetingText;

        // Update sidebar profile card
        const profileNameEl = document.getElementById('profile-name');
        if (profileNameEl) {
            profileNameEl.textContent = name;
        }

        const profileEmailEl = document.getElementById('profile-email');
        if (profileEmailEl) {
            const email = localStorage.getItem('studentEmail');
            const phone = localStorage.getItem('studentPhone');
            profileEmailEl.textContent = email || (phone ? `+91 ${phone}` : 'First-Year Student');
        }

        // Update greeting sub text welcome message
        const subGreetingEl = document.getElementById('greeting-sub-text');
        if (subGreetingEl) {
            const welcomeText = translations[langCode]['greeting_sub'] || translations.en['greeting_sub'];
            subGreetingEl.textContent = `${welcomeText}, ${name}`;
        }
    }

    function resetDashboardAnimations() {
        document.querySelectorAll('.dashboard-stagger').forEach(el => {
            el.style.animation = 'none';
            el.offsetHeight; // force reflow
            el.style.animation = '';
        });
    }

    function resetDetailAnimations() {
        document.querySelectorAll('.detail-stagger').forEach(el => {
            el.style.animation = 'none';
            el.offsetHeight; // force reflow
            el.style.animation = '';
        });
    }


    // ── Hidden File Input & Upload Buttons ──────────────────
    const fileInput = document.getElementById('file-input');
    const btnUploadGallery = document.getElementById('btn-upload-gallery');
    const btnUploadPdf = document.getElementById('btn-upload-pdf');

    if (btnUploadGallery && fileInput) {
        btnUploadGallery.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.accept = 'image/*';
            fileInput.value = '';
            fileInput.click();
        });
    }

    if (btnUploadPdf && fileInput) {
        btnUploadPdf.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.accept = 'application/pdf';
            fileInput.value = '';
            fileInput.click();
        });
    }

    const uploadZone = document.getElementById('upload-zone');
    if (uploadZone && fileInput) {
        uploadZone.addEventListener('click', (e) => {
            // Avoid triggering if child button was clicked
            if (e.target.closest('#btn-upload-camera') || e.target.closest('#btn-upload-gallery') || e.target.closest('#btn-upload-pdf')) {
                return;
            }
            fileInput.accept = 'image/*,application/pdf';
            fileInput.value = '';
            fileInput.click();
        });
    }

    // Sidebar upload button
    const sidebarUploadBtn = document.getElementById('sidebar-upload-btn');
    if (sidebarUploadBtn && fileInput) {
        sidebarUploadBtn.addEventListener('click', () => {
            fileInput.accept = 'image/*,application/pdf';
            fileInput.value = '';
            fileInput.click();
        });
    }

    // FAB upload button
    const fabUpload = document.getElementById('fab-upload');
    if (fabUpload && fileInput) {
        fabUpload.addEventListener('click', () => {
            fileInput.accept = 'image/*,application/pdf';
            fileInput.value = '';
            fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                startRealProcessing(e.target.files[0]);
            }
        });
    }

    // ── Camera Feed & Capture Logic ─────────────────────────
    const cameraModal = document.getElementById('camera-modal');
    const cameraClose = document.getElementById('camera-close');
    const cameraPreview = document.getElementById('camera-preview');
    const cameraCanvas = document.getElementById('camera-canvas');
    const cameraCapture = document.getElementById('camera-capture');
    let cameraStream = null;

    async function startCamera() {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            cameraPreview.srcObject = cameraStream;
            cameraModal.classList.remove('hidden');
        } catch (err) {
            alert('कैमरा शुरू करने में असमर्थ / Unable to start camera. Please check permissions.');
        }
    }

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        cameraPreview.srcObject = null;
        cameraModal.classList.add('hidden');
    }

    if (cameraClose) {
        cameraClose.addEventListener('click', stopCamera);
    }

    const btnUploadCamera = document.getElementById('btn-upload-camera');
    if (btnUploadCamera) {
        btnUploadCamera.addEventListener('click', (e) => {
            e.stopPropagation();
            startCamera();
        });
    }

    if (cameraCapture) {
        cameraCapture.addEventListener('click', () => {
            if (!cameraStream) return;
            
            const width = cameraPreview.videoWidth || 640;
            const height = cameraPreview.videoHeight || 480;
            cameraCanvas.width = width;
            cameraCanvas.height = height;
            
            const ctx = cameraCanvas.getContext('2d');
            ctx.drawImage(cameraPreview, 0, 0, width, height);
            
            cameraCanvas.toBlob((blob) => {
                stopCamera();
                if (blob) {
                    const file = new File([blob], 'captured_document.jpg', { type: 'image/jpeg' });
                    startRealProcessing(file);
                }
            }, 'image/jpeg', 0.9);
        });
    }

    // ── Real Processing Pipeline (SSE Stream) ───────────────
    async function startRealProcessing(file) {
        navigateTo('processing', 'forward');
        
        const statusEl = document.getElementById('status-text');
        const progressFill = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');

        if (!statusEl || !progressFill || !progressPercent) return;

        // Reset UI
        progressFill.style.width = '5%';
        progressPercent.textContent = '5%';
        statusEl.textContent = 'दस्तावेज़ अपलोड हो रहा है... / Uploading document...';
        progressFill.style.backgroundColor = '';

        // Clean up previous audio instance if any
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        const preferredLanguage = localStorage.getItem('preferredLanguage') || 'hi';
        const formData = new FormData();
        formData.append('file', file);
        formData.append('language', preferredLanguage);

        try {
            const response = await fetch(`${API_BASE_URL}/api/decode`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('API server returned an error.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let sseBuffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                sseBuffer += decoder.decode(value, { stream: true });
                let boundary = sseBuffer.indexOf('\n\n');
                
                while (boundary !== -1) {
                    const messageBlock = sseBuffer.substring(0, boundary).trim();
                    sseBuffer = sseBuffer.substring(boundary + 2);
                    
                    if (messageBlock) {
                        let eventType = 'message';
                        let dataContent = '';
                        
                        const lines = messageBlock.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('event:')) {
                                eventType = line.substring(6).trim();
                            } else if (line.startsWith('data:')) {
                                dataContent = line.substring(5).trim();
                            }
                        }
                        
                        handleSSEEvent(eventType, dataContent, statusEl, progressFill, progressPercent);
                    }
                    boundary = sseBuffer.indexOf('\n\n');
                }
            }
        } catch (err) {
            statusEl.textContent = '❌ त्रुटि हुई / Error: ' + err.message;
            progressFill.style.backgroundColor = '#ba1a1a';
            console.error(err);
        }
    }

    function handleSSEEvent(eventType, dataContent, statusEl, progressFill, progressPercent) {
        if (eventType === 'error') {
            try {
                const errData = JSON.parse(dataContent);
                statusEl.textContent = `❌ ${errData.message || 'त्रुटि हुई / Error'}`;
            } catch {
                statusEl.textContent = `❌ त्रुटि हुई / Error: ${dataContent}`;
            }
            progressFill.style.backgroundColor = '#ba1a1a';
            return;
        }

        if (eventType === 'stage') {
            if (dataContent === 'extracting') {
                statusEl.textContent = 'दस्तावेज़ पढ़ा जा रहा है... / Reading document...';
                progressFill.style.width = '35%';
                progressPercent.textContent = '35%';
            } else if (dataContent === 'simplifying') {
                statusEl.textContent = 'आसान भाषा में समझाया जा रहा है... / Explaining in simple terms...';
                progressFill.style.width = '70%';
                progressPercent.textContent = '70%';
            } else {
                // Must be the final done payload
                try {
                    const payload = JSON.parse(dataContent);
                    if (payload.stage === 'done') {
                        progressFill.style.width = '100%';
                        progressPercent.textContent = '100%';
                        statusEl.textContent = '✅ तैयार है! / Ready!';
                        
                        currentSessionId = payload.sessionId;
                        currentDocumentData = payload;

                        // Render to Detail Screen
                        renderDetailScreen(payload);

                        // Reset Chat view
                        const chatMessages = document.getElementById('chat-messages');
                        if (chatMessages) {
                            chatMessages.innerHTML = `
                                <div class="flex gap-4 items-start max-w-[80%]">
                                    <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">PB</div>
                                    <div class="bg-surface-container-high text-on-surface p-4 rounded-2xl rounded-tl-none text-body-md font-body-md shadow-sm">
                                        दस्तावेज़ के बारे में कुछ भी पूछें। मैं आपका बड़ा भाई हूँ और बिना किसी कठिन शब्द के इसे समझाऊँगा!
                                    </div>
                                </div>
                            `;
                        }

                        setTimeout(() => {
                            navigateTo('detail', 'forward');
                        }, 1000);
                    }
                } catch (err) {
                    console.error('Failed to parse done payload:', err);
                }
            }
        }
    }

    function renderDetailScreen(payload) {
        const detailTitle = document.getElementById('detail-title');
        const detailCategory = document.getElementById('detail-category');
        const detailLanguage = document.getElementById('detail-language');
        const detailDate = document.getElementById('detail-date');

        if (detailTitle) detailTitle.textContent = 'दस्तावेज़ विवरण / Document Details';
        if (detailCategory) detailCategory.textContent = 'Scan / Scan';
        if (detailLanguage) {
            const langCode = payload.language || 'hi';
            const langName = { hi: 'हिंदी', mr: 'मराठी', ta: 'தமிழ்', bn: 'বাংলা', te: 'తెలుగు', en: 'English' }[langCode] || 'English';
            detailLanguage.textContent = langName;
        }
        if (detailDate) detailDate.textContent = 'Just Scanned';

        // TL;DR
        const detailTldr = document.getElementById('detail-tldr');
        if (detailTldr) {
            detailTldr.innerHTML = payload.simplified_text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary font-bold">$1</strong>');
        }

        // Key Data Chips
        const keyChipsSection = document.getElementById('detail-key-chips');
        if (keyChipsSection) {
            let chipsHtml = '<div class="flex gap-4 min-w-max">';
            
            // Amounts
            if (payload.amounts && payload.amounts.length > 0) {
                payload.amounts.forEach(amt => {
                    chipsHtml += `
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-4 shadow-sm">
                            <div class="bg-primary/10 p-3 rounded-full text-primary"><span class="material-symbols-outlined">payments</span></div>
                            <div>
                                <p class="text-label-sm font-label-sm text-on-surface-variant">${amt.label}</p>
                                <p class="text-body-lg font-body-lg font-bold text-on-surface">${amt.value}</p>
                            </div>
                        </div>
                    `;
                });
            } else {
                chipsHtml += `
                    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-4 shadow-sm">
                        <div class="bg-primary/10 p-3 rounded-full text-primary"><span class="material-symbols-outlined">payments</span></div>
                        <div>
                            <p class="text-label-sm font-label-sm text-on-surface-variant">रकम / Amount</p>
                            <p class="text-body-lg font-body-lg font-bold text-on-surface">कोई शुल्क नहीं / No Fees</p>
                        </div>
                    </div>
                `;
            }

            // Deadlines
            if (payload.deadline_dates && payload.deadline_dates.length > 0) {
                payload.deadline_dates.forEach(dl => {
                    const parts = dl.split('—');
                    const dateText = parts[0] ? parts[0].trim() : 'Deadline';
                    const descText = parts[1] ? parts[1].trim() : dl;
                    chipsHtml += `
                        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-4 shadow-sm">
                            <div class="bg-tertiary/10 p-3 rounded-full text-tertiary"><span class="material-symbols-outlined">calendar_today</span></div>
                            <div>
                                <p class="text-label-sm font-label-sm text-on-surface-variant">${descText}</p>
                                <p class="text-body-lg font-body-lg font-bold text-on-surface">${dateText}</p>
                            </div>
                        </div>
                    `;
                });
            }

            chipsHtml += '</div>';
            keyChipsSection.innerHTML = chipsHtml;
        }

        // Steps (Next Steps)
        const stepsContainer = document.getElementById('detail-steps-container');
        if (stepsContainer) {
            stepsContainer.innerHTML = '';
            if (payload.key_actions && payload.key_actions.length > 0) {
                payload.key_actions.forEach((action, idx) => {
                    const stepCard = `
                        <div class="group relative bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div class="flex gap-6">
                                <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0">${idx + 1}</div>
                                <div class="space-y-2">
                                    <p class="text-body-lg font-body-lg text-on-surface">${action}</p>
                                </div>
                            </div>
                        </div>
                    `;
                    stepsContainer.insertAdjacentHTML('beforeend', stepCard);
                });
            } else {
                stepsContainer.innerHTML = '<p class="text-on-surface-variant">No immediate actions found.</p>';
            }
        }

        // Checklist
        const checklistContainer = document.getElementById('detail-checklist-container');
        if (checklistContainer) {
            checklistContainer.innerHTML = '';
            if (payload.deadline_dates && payload.deadline_dates.length > 0) {
                payload.deadline_dates.forEach((dl) => {
                    const parts = dl.split('—');
                    const dateText = parts[0] ? parts[0].trim() : 'Urgent';
                    const descText = parts[1] ? parts[1].trim() : dl;

                    const chkCard = `
                        <label class="flex items-center gap-4 p-4 bg-white rounded-xl border border-outline-variant cursor-pointer active:scale-[0.98] transition-transform">
                            <input class="w-6 h-6 rounded text-primary focus:ring-primary border-outline-variant" type="checkbox"/>
                            <div class="flex-grow">
                                <p class="text-body-md font-body-md font-bold">${descText}</p>
                                <p class="text-label-sm font-label-sm text-error">${dateText}</p>
                            </div>
                            <span class="material-symbols-outlined text-error">priority_high</span>
                        </label>
                    `;
                    checklistContainer.insertAdjacentHTML('beforeend', chkCard);
                });
            } else {
                checklistContainer.innerHTML = '<p class="text-on-surface-variant">No checklist items found.</p>';
            }
        }

        // Glossary Accordions
        const glossaryContainer = document.getElementById('detail-glossary-container');
        if (glossaryContainer) {
            glossaryContainer.innerHTML = '';
            const definitions = [
                { term: 'Eligibility', def: 'योग्यता/पात्रता - वे नियम या शर्तें जिन्हें पूरा करने पर ही आपको किसी योजना या स्कॉलरशिप का लाभ मिल सकता है।' },
                { term: 'Mandatory', def: 'अनिवार्य - वह काम जिसे हर हाल में करना ही होगा, जिसके बिना आपकी अर्जी पूरी नहीं मानी जाएगी।' },
                { term: 'Tuition Fee', def: 'ट्यूशन फीस - वह शुल्क जो सीधे आपकी पढ़ाई और कॉलेज में क्लास लेने के बदले लिया जाता है।' }
            ];

            definitions.forEach((item) => {
                const detailsHtml = `
                    <details class="group py-4">
                        <summary class="flex justify-between items-center cursor-pointer list-none">
                            <span class="text-body-lg font-body-lg font-bold">${item.term}</span>
                            <span class="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                        </summary>
                        <div class="pt-4 text-body-md font-body-md text-on-surface-variant">
                            ${item.def}
                        </div>
                    </details>
                `;
                glossaryContainer.insertAdjacentHTML('beforeend', detailsHtml);
            });
        }

        // Render follow-up suggestions
        if (payload.follow_up_suggestions) {
            renderChatSuggestions(payload.follow_up_suggestions);
        }
    }

    function renderChatSuggestions(suggestions) {
        const chatSuggestions = document.getElementById('chat-suggestions');
        const chatInput = document.getElementById('chat-input');
        const chatForm = document.getElementById('chat-form');

        if (!chatSuggestions) return;
        chatSuggestions.innerHTML = '';
        suggestions.forEach(suggestion => {
            const btn = document.createElement('button');
            btn.className = 'px-3 py-1.5 bg-surface-container-high text-on-surface-variant border border-outline-variant/60 rounded-full font-label-md text-label-md flex-shrink-0 hover:bg-primary/10 hover:text-primary transition-colors active:scale-95';
            btn.textContent = suggestion;
            btn.addEventListener('click', () => {
                if (chatInput && chatForm) {
                    chatInput.value = suggestion;
                    chatForm.dispatchEvent(new Event('submit'));
                }
            });
            chatSuggestions.appendChild(btn);
        });
    }

    // ── Chat Q&A Stateful Client ───────────────────────────
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!chatInput || !chatMessages) return;
            const message = chatInput.value.trim();
            if (!message) return;

            // Clear input
            chatInput.value = '';

            // Render user message
            renderChatMessage('user', message);

            // Render thinking indicator
            const thinkingId = renderChatMessage('assistant', '...');

            try {
                const response = await fetch(`${API_BASE_URL}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: currentSessionId,
                        message: message,
                        language: localStorage.getItem('preferredLanguage') || 'hi'
                    })
                });

                if (!response.ok) throw new Error('Failed to get chat reply.');
                const data = await response.json();

                // Remove thinking indicator and render actual reply
                const thinkingEl = document.getElementById(thinkingId);
                if (thinkingEl) thinkingEl.remove();
                renderChatMessage('assistant', data.reply);
            } catch (err) {
                const thinkingEl = document.getElementById(thinkingId);
                if (thinkingEl) thinkingEl.remove();
                renderChatMessage('assistant', 'Error: ' + err.message);
            }
        });
    }

    function renderChatMessage(role, content) {
        const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const isUser = role === 'user';
        
        const msgHtml = isUser ? `
            <div id="${msgId}" class="flex gap-4 items-start justify-end max-w-[80%] ml-auto">
                <div class="bg-primary text-white p-4 rounded-2xl rounded-tr-none text-body-md font-body-md shadow-sm">
                    ${content}
                </div>
                <div class="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white text-xs font-bold shrink-0">मी</div>
            </div>
        ` : `
            <div id="${msgId}" class="flex gap-4 items-start max-w-[80%]">
                <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">PB</div>
                <div class="bg-surface-container-high text-on-surface p-4 rounded-2xl rounded-tl-none text-body-md font-body-md shadow-sm">
                    ${content}
                </div>
            </div>
        `;
        
        chatMessages.insertAdjacentHTML('beforeend', msgHtml);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgId;
    }

    // Dummy functions for start/stop processing compatibility
    function startProcessing() {}
    function stopProcessing() {}

    // ── Detail Screen: Back Button ───────────────────
    const btnBack = document.getElementById('btn-back-detail');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            // Clean up audio player when navigating away
            if (currentAudio) {
                currentAudio.pause();
                currentAudio = null;
            }
            navigateTo('dashboard', 'back');
        });
    }

    // ── Detail Screen: Toggle Original English Text ──
    const toggleOriginal = document.getElementById('toggle-original');
    if (toggleOriginal) {
        toggleOriginal.addEventListener('change', () => {
            document.querySelectorAll('.original-text').forEach(text => {
                text.classList.toggle('hidden');
            });
        });
    }

    // ── Detail Screen: Audio Player ──────────────────
    function initAudioPlayer() {
        const playBtn = document.getElementById('playBtn');
        if (!playBtn) return;

        // Remove old listeners by cloning
        const newPlayBtn = playBtn.cloneNode(true);
        playBtn.parentNode.replaceChild(newPlayBtn, playBtn);

        const icon = newPlayBtn.querySelector('.material-symbols-outlined');

        newPlayBtn.addEventListener('click', async () => {
            if (currentAudio) {
                if (!currentAudio.paused) {
                    currentAudio.pause();
                    icon.textContent = 'play_arrow';
                    toggleWaveformAnimation(false);
                } else {
                    currentAudio.play().catch(console.error);
                    icon.textContent = 'pause';
                    toggleWaveformAnimation(true);
                }
            } else {
                if (!currentDocumentData) return;
                
                // Show loading state
                icon.textContent = 'hourglass_empty';
                
                try {
                    const response = await fetch(`${API_BASE_URL}/api/speak`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId: currentSessionId,
                            text: currentDocumentData.simplified_text,
                            language: currentDocumentData.language
                        })
                    });
                    
                    if (!response.ok) throw new Error('Speech synthesis failed.');
                    const data = await response.json();
                    
                    currentAudio = new Audio(data.audio_url);
                    
                    currentAudio.addEventListener('ended', () => {
                        icon.textContent = 'play_arrow';
                        toggleWaveformAnimation(false);
                    });
                    
                    currentAudio.addEventListener('canplaythrough', () => {
                        currentAudio.play().catch(console.error);
                        icon.textContent = 'pause';
                        toggleWaveformAnimation(true);
                    });
                    
                    currentAudio.load();
                } catch (err) {
                    icon.textContent = 'error';
                    console.error(err);
                }
            }
        });

        // Initialize as paused
        toggleWaveformAnimation(false);
    }

    function toggleWaveformAnimation(play) {
        document.querySelectorAll('.waveform-bar').forEach(bar => {
            bar.style.animationPlayState = play ? 'running' : 'paused';
        });
    }

    // Close audio player button
    const btnClosePlayer = document.getElementById('btn-close-player');
    if (btnClosePlayer) {
        btnClosePlayer.addEventListener('click', () => {
            const playerContainer = btnClosePlayer.closest('.fixed');
            if (playerContainer) {
                playerContainer.style.transform = 'translateY(120%)';
                playerContainer.style.opacity = '0';
                playerContainer.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    playerContainer.style.display = 'none';
                }, 300);
            }
        });
    }


    // ── Dashboard: Bottom Nav Interactions ────────────
    const bottomNavTargets = { home: 'dashboard', docs: 'documents', glossary: 'glossary', help: 'support' };
    document.querySelectorAll('#bottom-nav .bottom-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Update active state
            document.querySelectorAll('#bottom-nav .bottom-nav-link').forEach(l => {
                l.classList.remove('active', 'bg-primary-container', 'text-on-primary-container', 'rounded-full');
                l.classList.add('text-on-surface-variant');
                const icon = l.querySelector('.material-symbols-outlined');
                if (icon) icon.style.fontVariationSettings = "'FILL' 0";
            });

            link.classList.add('active', 'bg-primary-container', 'text-on-primary-container', 'rounded-full');
            link.classList.remove('text-on-surface-variant');
            const activeIcon = link.querySelector('.material-symbols-outlined');
            if (activeIcon) activeIcon.style.fontVariationSettings = "'FILL' 1";

            const target = bottomNavTargets[link.dataset.nav];
            if (target && target !== currentScreen) {
                navigateTo(target, 'forward');
            }
        });
    });


    // ── Dashboard: Desktop Sidebar Nav ───────────────
    const navTargets = { home: 'dashboard', docs: 'documents', glossary: 'glossary', support: 'support' };
    document.querySelectorAll('#desktop-nav .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            document.querySelectorAll('#desktop-nav .nav-link').forEach(l => {
                l.classList.remove('active', 'bg-secondary-container', 'text-on-secondary-container', 'font-bold', 'translate-x-1');
                l.classList.add('text-on-surface-variant');
            });

            link.classList.add('active', 'bg-secondary-container', 'text-on-secondary-container', 'font-bold', 'translate-x-1');
            link.classList.remove('text-on-surface-variant');

            const target = navTargets[link.dataset.nav];
            if (target && target !== currentScreen) {
                navigateTo(target, 'forward');
            }
        });
    });


    // ── Keyboard Navigation Support ──────────────────
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (currentScreen === 'detail') {
                navigateTo('dashboard', 'back');
            } else if (currentScreen === 'processing') {
                stopProcessing();
                navigateTo('dashboard', 'back');
            }
        }
    });


    // ── Browser History Support ──────────────────────
    function pushState(screen) {
        history.pushState({ screen }, '', `#${screen}`);
    }

    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.screen) {
            navigateTo(e.state.screen, 'back');
        } else {
            navigateTo('login', 'back');
        }
    });

    // Override navigateTo to push state
    const originalNavigateTo = navigateTo;
    window.navigateTo = function (screenName, direction) {
        originalNavigateTo(screenName, direction);
        if (direction !== 'back') {
            pushState(screenName);
        }
    };

    // Reassign for internal use too
    const navTo = window.navigateTo;


    // ── Initialize ──────────────────────────────────
    function init() {
        // Fetch config from backend
        fetch(`${API_BASE_URL}/api/auth/config`)
            .then(res => res.json())
            .then(data => {
                googleClientId = data.googleClientId;
                if (googleClientId && window.google) {
                    initGoogleSignIn();
                }
            })
            .catch(err => {
                console.warn('Failed to load public config from backend:', err);
            });

        // Load preferred language
        const savedLang = localStorage.getItem('preferredLanguage') || 'hi';
        applyLanguage(savedLang);
        syncOnboardingChips(savedLang);

        // Glossary Search & Alphabet Filter logic
        const glossarySearch = document.getElementById('glossary-search');
        const alphabetTabs = document.querySelectorAll('#glossary-alphabet-tabs button');

        function filterGlossary() {
            const query = glossarySearch ? glossarySearch.value.toLowerCase().trim() : '';
            const activeTab = document.querySelector('#glossary-alphabet-tabs button.bg-primary');
            const range = activeTab ? activeTab.dataset.range : 'All';
            const detailsElements = document.querySelectorAll('#glossary-list details');
            let foundCount = 0;

            detailsElements.forEach(details => {
                const term = details.querySelector('summary').textContent.toLowerCase().trim();
                const definition = details.querySelector('div').textContent.toLowerCase();
                const firstLetter = term.charAt(0);

                let matchesRange = true;
                if (range !== 'All') {
                    const parts = range.split('-');
                    if (parts.length === 2) {
                        const startChar = parts[0].toLowerCase();
                        const endChar = parts[1].toLowerCase();
                        matchesRange = (firstLetter >= startChar && firstLetter <= endChar);
                    }
                }

                const matchesQuery = term.includes(query) || definition.includes(query);

                if (matchesRange && matchesQuery) {
                    details.classList.remove('hidden');
                    foundCount++;
                } else {
                    details.classList.add('hidden');
                }
            });

            // Update search count text
            const countEl = document.querySelector('#screen-glossary main > p.text-label-md');
            if (countEl) {
                const langCode = localStorage.getItem('preferredLanguage') || 'hi';
                if (langCode === 'hi') countEl.textContent = `${foundCount} शब्द मिले`;
                else if (langCode === 'mr') countEl.textContent = `${foundCount} शब्द सापडले`;
                else if (langCode === 'ta') countEl.textContent = `${foundCount} சொற்கள் காணப்பட்டன`;
                else if (langCode === 'bn') countEl.textContent = `${foundCount}টি শব্দ পাওয়া গেছে`;
                else if (langCode === 'te') countEl.textContent = `${foundCount} పదాలు కనుగొనబడ్డాయి`;
                else countEl.textContent = `${foundCount} terms found`;
            }
        }

        if (glossarySearch) {
            glossarySearch.addEventListener('input', filterGlossary);
        }

        if (alphabetTabs.length > 0) {
            alphabetTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Update active classes for tabs
                    alphabetTabs.forEach(t => {
                        t.classList.remove('bg-primary', 'text-on-primary');
                        t.classList.add('bg-surface-container-high', 'text-on-surface-variant');
                    });
                    tab.classList.add('bg-primary', 'text-on-primary');
                    tab.classList.remove('bg-surface-container-high', 'text-on-surface-variant');

                    // Filter glossary
                    filterGlossary();
                });
            });
        }

        // Documents filtering logic
        const docFilters = document.querySelectorAll('#doc-filters button');
        const docCards = document.querySelectorAll('#screen-documents .doc-card');
        if (docFilters.length > 0) {
            docFilters.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Update active classes
                    docFilters.forEach(b => {
                        b.classList.remove('bg-primary', 'text-on-primary');
                        b.classList.add('bg-surface-container-high', 'text-on-surface-variant');
                    });
                    btn.classList.add('bg-primary', 'text-on-primary');
                    btn.classList.remove('bg-surface-container-high', 'text-on-surface-variant');

                    const filter = btn.dataset.filter;
                    let visibleCount = 0;
                    docCards.forEach(card => {
                        if (filter === 'All' || card.dataset.category === filter) {
                            card.classList.remove('hidden');
                            visibleCount++;
                        } else {
                            card.classList.add('hidden');
                        }
                    });

                    // Update documents count label
                    const statsEl = document.querySelector('#screen-documents main > div.flex.items-center.justify-between p.text-label-md');
                    if (statsEl) {
                        const langCode = localStorage.getItem('preferredLanguage') || 'hi';
                        if (langCode === 'hi') statsEl.textContent = `${visibleCount} दस्तावेज़`;
                        else if (langCode === 'mr') statsEl.textContent = `${visibleCount} दस्तऐवज`;
                        else if (langCode === 'ta') statsEl.textContent = `${visibleCount} ஆவணங்கள்`;
                        else if (langCode === 'bn') statsEl.textContent = `${visibleCount}টি নথি`;
                        else if (langCode === 'te') statsEl.textContent = `${visibleCount} పత్రాలు`;
                        else statsEl.textContent = `${visibleCount} Documents`;
                    }
                });
            });
        }

        // Documents Search logic
        const docSearch = document.getElementById('doc-search');
        if (docSearch) {
            docSearch.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const activeFilterBtn = document.querySelector('#doc-filters button.bg-primary');
                const filter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'All';
                let visibleCount = 0;
                docCards.forEach(card => {
                    const title = card.querySelector('h5').textContent.toLowerCase();
                    const subtitle = card.querySelector('p').textContent.toLowerCase();
                    const matchesCategory = filter === 'All' || card.dataset.category === filter;
                    const matchesQuery = title.includes(query) || subtitle.includes(query);
                    if (matchesCategory && matchesQuery) {
                        card.classList.remove('hidden');
                        visibleCount++;
                    } else {
                        card.classList.add('hidden');
                    }
                });

                // Update documents count label
                const statsEl = document.querySelector('#screen-documents main > div.flex.items-center.justify-between p.text-label-md');
                if (statsEl) {
                    const langCode = localStorage.getItem('preferredLanguage') || 'hi';
                    if (langCode === 'hi') statsEl.textContent = `${visibleCount} दस्तावेज़`;
                    else if (langCode === 'mr') statsEl.textContent = `${visibleCount} दस्तऐवज`;
                    else if (langCode === 'ta') statsEl.textContent = `${visibleCount} ஆவணங்கள்`;
                    else if (langCode === 'bn') statsEl.textContent = `${visibleCount}টি নথি`;
                    else if (langCode === 'te') statsEl.textContent = `${visibleCount} పత్రాలు`;
                    else statsEl.textContent = `${visibleCount} Documents`;
                }
            });
        }

        // ── Logout controllers ──────────────────────────────────
        function handleLogout() {
            if (confirm('क्या आप लॉगआउट करना चाहते हैं? / Are you sure you want to log out?')) {
                // Clear session tokens and credentials
                localStorage.removeItem('authToken');
                localStorage.removeItem('studentName');
                localStorage.removeItem('studentEmail');
                localStorage.removeItem('studentPhone');
                
                // Reset login form to initial state
                resetLoginForm();
                
                // Navigate back to login screen
                navigateTo('login', 'back');
            }
        }

        const btnLogoutDesktop = document.getElementById('btn-logout-desktop');
        const btnLogoutMobile = document.getElementById('btn-logout-mobile');

        if (btnLogoutDesktop) {
            btnLogoutDesktop.addEventListener('click', handleLogout);
        }
        if (btnLogoutMobile) {
            btnLogoutMobile.addEventListener('click', handleLogout);
        }

        // ── Credentials Setup Modal controllers ─────────────────
        const btnOpenSettings = document.getElementById('btn-open-settings');
        const settingsModal = document.getElementById('settings-modal');
        const settingsClose = document.getElementById('settings-close');
        const btnSaveSettings = document.getElementById('btn-save-settings');

        const inputTwilioSid = document.getElementById('setup-twilio-sid');
        const inputTwilioToken = document.getElementById('setup-twilio-token');
        const inputTwilioFrom = document.getElementById('setup-twilio-from');
        const inputGoogleClient = document.getElementById('setup-google-client');

        if (btnOpenSettings && settingsModal) {
            btnOpenSettings.addEventListener('click', () => {
                // Pre-fill modal values from current config via fetch
                fetch(`${API_BASE_URL}/api/auth/config`)
                    .then(res => res.json())
                    .then(data => {
                        if (inputGoogleClient) inputGoogleClient.value = data.googleClientId || '';
                    });
                settingsModal.classList.remove('hidden');
            });
        }

        if (settingsClose && settingsModal) {
            settingsClose.addEventListener('click', () => {
                settingsModal.classList.add('hidden');
            });
        }

        if (btnSaveSettings) {
            btnSaveSettings.addEventListener('click', async () => {
                btnSaveSettings.disabled = true;
                btnSaveSettings.textContent = 'Saving & Connecting...';

                try {
                    const res = await fetch(`${API_BASE_URL}/api/auth/setup-credentials`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            twilioSid: inputTwilioSid.value.trim(),
                            twilioToken: inputTwilioToken.value.trim(),
                            twilioFrom: inputTwilioFrom.value.trim(),
                            googleClientId: inputGoogleClient.value.trim()
                        })
                    });

                    if (!res.ok) throw new Error('Failed to save settings.');

                    alert('सफलता! क्रेडेंशियल सहेज लिए गए हैं। सर्वर पुनरारंभ हो रहा है। / Success! Credentials saved. Server is restarting.');
                    settingsModal.classList.add('hidden');
                    // Reload config after a short delay
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } catch (err) {
                    alert('त्रुटि / Error: ' + err.message);
                } finally {
                    btnSaveSettings.disabled = false;
                    btnSaveSettings.textContent = 'Save & Connect';
                }
            });
        }

        // ── Google Sandbox Modal controllers ─────────────────────
        const googleSandboxModal = document.getElementById('google-sandbox-modal');
        const googleSandboxClose = document.getElementById('google-sandbox-close');
        const btnSandboxSubmit = document.getElementById('btn-sandbox-submit');
        const sandboxNameInput = document.getElementById('sandbox-name');
        const sandboxEmailInput = document.getElementById('sandbox-email');

        if (googleSandboxClose && googleSandboxModal) {
            googleSandboxClose.addEventListener('click', () => {
                googleSandboxModal.classList.add('hidden');
            });
        }

        if (btnSandboxSubmit && googleSandboxModal) {
            btnSandboxSubmit.addEventListener('click', async () => {
                const name = sandboxNameInput ? sandboxNameInput.value.trim() : 'Google Scholar';
                const email = sandboxEmailInput ? sandboxEmailInput.value.trim() : 'scholar@google.com';

                btnSandboxSubmit.disabled = true;
                btnSandboxSubmit.textContent = 'Logging in...';

                try {
                    const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isSandbox: true, name, email })
                    });

                    if (!res.ok) throw new Error('Sandbox login verification failed');
                    const data = await res.json();

                    localStorage.setItem('studentName', data.name);
                    localStorage.setItem('studentEmail', data.email);
                    if (data.token) {
                        localStorage.setItem('authToken', data.token);
                    }

                    updateGreeting();
                    googleSandboxModal.classList.add('hidden');
                    navigateTo('onboarding', 'forward');
                } catch (err) {
                    alert('Sandbox login failed: ' + err.message);
                } finally {
                    btnSandboxSubmit.disabled = false;
                    btnSandboxSubmit.textContent = 'Confirm Sandbox Login';
                }
            });
        }

        // Check for hash-based routing
        const hash = window.location.hash.replace('#', '');
        if (hash && screens[hash]) {
            // Skip directly to that screen
            screens['login'].classList.remove('active');
            screens[hash].classList.add('active');
            currentScreen = hash;

            if (hash === 'dashboard') updateGreeting();
            if (hash === 'detail') initAudioPlayer();
        }

        // Initialize waveform bars as paused
        document.querySelectorAll('.waveform-bar').forEach(bar => {
            bar.style.animationPlayState = 'paused';
        });
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
