# tools.py

import asyncio
import logging
from datetime import datetime, timedelta
import pytz
from typing import Annotated
from livekit.agents import llm
import os
import requests
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import base64
from email.mime.text import MIMEText

logger = logging.getLogger("voice-assistant-tools")

######################################
# MAIN TOOLS LISTING
######################################
# 1. Weather Tools
#    - kelvin_to_celsius
#    - get_weather_description
#    - get_weather
#
# 2. Time & Date Tools
#    - get_current_time
#    - get_current_date
#
# 3. Calendar Tools
#    - get_date_range
#    - format_event_time
#    - format_date_for_speech
#    - fetch_calendar_events
#    - create_calendar_event
#
# 4. Gmail Tools
#    - get_email_summary
#    - create_draft

class AssistantTools(llm.FunctionContext):

    ######################################
    # WEATHER TOOLS
    ######################################
    def kelvin_to_celsius(self, kelvin):
        return round(kelvin - 273.15)

    def get_weather_description(self, weather_data):
        temp = self.kelvin_to_celsius(weather_data['main']['temp'])
        feels_like = self.kelvin_to_celsius(weather_data['main']['feels_like'])
        condition = weather_data['weather'][0]['description']
        humidity = weather_data['main']['humidity']
        wind_speed = weather_data['wind']['speed']

        responses = [
            f"In {weather_data['name']}, it's {condition} right now. The temperature is {temp}°C, but it feels like {feels_like}°C. ",
            f"{'It is quite warm' if temp > 25 else 'It is quite cool' if temp < 15 else 'The temperature is pleasant'}. ",
            f"{'The humidity is quite high at' if humidity > 70 else 'The humidity is comfortable at'} {humidity}%. ",
            f"{'It is quite windy' if wind_speed > 20 else 'There is a gentle breeze'} with wind speeds of {wind_speed} meters per second."
        ]

        return "".join(responses)

    @llm.ai_callable()
    async def get_weather(
        self,
        location: Annotated[
            str, llm.TypeInfo(description="The location to get the weather for")
        ],
    ):
        """Get real weather information for a location using OpenWeather API."""
        logger.info(f"Getting weather for {location}")
        try:
            api_key = os.getenv('OPENWEATHER_API_KEY')
            if not api_key:
                return "I'm sorry, but I can't access the weather service right now due to missing API key."

            url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={api_key}"
            response = requests.get(url)

            if response.status_code == 200:
                weather_data = response.json()
                return self.get_weather_description(weather_data)
            elif response.status_code == 404:
                return f"I'm sorry, but I couldn't find weather information for {location}. Could you please check if the location name is correct?"
            else:
                return "I'm having trouble getting the weather information right now."

        except requests.RequestException:
            logger.error("Failed to connect to weather service")
            return "I'm having trouble connecting to the weather service."
        except Exception as e:
            logger.error(f"Error getting weather: {e}")
            return f"I'm sorry, but something went wrong while getting the weather information."

    ######################################
    # TIME & DATE TOOLS
    ######################################
    @llm.ai_callable()
    async def get_current_time(
        self,
        timezone: Annotated[
            str, 
            llm.TypeInfo(description="The timezone to get time for (e.g., Asia/Kolkata for IST)")
        ] = "Asia/Kolkata"
    ):
        """Returns the current time in Indian Standard Time (IST) or specified timezone. Default timezone is IST (Asia/Kolkata)."""
        try:
            tz = pytz.timezone(timezone)
            current_time = datetime.now(tz)
            formatted_time = current_time.strftime("%I:%M %p")
            logger.info(f"Getting time for timezone: {timezone}")
            return f"The current time is {formatted_time} {timezone}"
        except Exception as e:
            logger.error(f"Error getting time: {e}")
            return "Sorry, I couldn't get the current time."
        
    
    @llm.ai_callable()
    async def get_current_date(self):
        """Returns the current date in a natural format."""
        ist = pytz.timezone('Asia/Kolkata')
        now = datetime.now(ist)
        day = now.day
        suffix = "th" if 4 <= day <= 20 or 24 <= day <= 30 else ["st", "nd", "rd"][day % 10 - 1] if day % 10 in [1, 2, 3] else "th"
        return f"{day}{suffix} {now.strftime('%B, %Y')}"

    ######################################
    # CALENDAR TOOLS
    ######################################
    def get_date_range(self, date_query: str):
        """Convert date query to start and end datetime objects."""
        ist = pytz.timezone('Asia/Kolkata')
        now = datetime.now(ist)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        if date_query.lower() == "today":
            start_time = today
            end_time = today + timedelta(days=1)
        elif date_query.lower() == "tomorrow":
            start_time = today + timedelta(days=1)
            end_time = today + timedelta(days=2)
        else:
            try:
                try:
                    specific_date = datetime.strptime(date_query, "%Y-%m-%d")
                except ValueError:
                    specific_date = datetime.strptime(date_query, "%d-%m-%Y")

                specific_date = ist.localize(specific_date)
                start_time = specific_date.replace(hour=0, minute=0, second=0, microsecond=0)
                end_time = start_time + timedelta(days=1)
            except ValueError:
                return None, None

        return start_time, end_time

    def format_event_time(self, event_datetime: datetime) -> str:
        """Format event time in a natural, conversational way."""
        ist = pytz.timezone('Asia/Kolkata')
        if isinstance(event_datetime, str):
            event_datetime = datetime.fromisoformat(event_datetime.replace('Z', '+00:00'))

        event_datetime = event_datetime.astimezone(ist)
        hour = event_datetime.strftime("%I").lstrip("0")
        minute = event_datetime.strftime("%M")
        ampm = event_datetime.strftime("%p")

        return f"{hour}:{minute} {ampm}" if minute != "00" else f"{hour} {ampm}"

    def format_date_for_speech(self, date_obj):
        """Format date in a natural, conversational way."""
        today = datetime.now(pytz.timezone('Asia/Kolkata')).date()
        date_obj = date_obj.date() if isinstance(date_obj, datetime) else date_obj

        if date_obj == today:
            return "today"
        elif date_obj == today + timedelta(days=1):
            return "tomorrow"
        else:
            day = date_obj.day
            suffix = "th" if 4 <= day <= 20 or 24 <= day <= 30 else ["st", "nd", "rd"][day % 10 - 1] if day % 10 in [1, 2, 3] else "th"
            return f"{day}{suffix} {date_obj.strftime('%B')}"

    @llm.ai_callable()
    async def fetch_calendar_events(
        self,
        date_query: Annotated[
            str, llm.TypeInfo(description="Date query (today/tomorrow/specific date)")
        ] = "today"
    ):
        """Fetch Google Calendar events for a specific date."""
        try:
            credentials = Credentials.from_authorized_user_file('token.json', ['https://www.googleapis.com/auth/calendar.readonly'])
            service = build('calendar', 'v3', credentials=credentials)

            start_time, end_time = self.get_date_range(date_query)
            if not start_time or not end_time:
                return "I couldn't understand that date. You can ask about today, tomorrow, or a specific date."

            events_result = service.events().list(
                calendarId='primary',
                timeMin=start_time.isoformat(),
                timeMax=end_time.isoformat(),
                singleEvents=True,
                orderBy='startTime'
            ).execute()

            events = events_result.get('items', [])

            if not events:
                date_str = self.format_date_for_speech(start_time)
                return f"You have no events scheduled for {date_str}."

            date_str = self.format_date_for_speech(start_time)
            response_parts = [f"Here's what's scheduled for {date_str}:"]

            for event in events:
                summary = event.get('summary', 'Unnamed Event')
                start = event['start'].get('dateTime', event['start'].get('date'))

                if 'T' in start:
                    time_str = self.format_event_time(start)
                    response_parts.append(f"{summary} at {time_str}")
                else:
                    response_parts.append(f"{summary} all day")

            return " ".join(response_parts)

        except Exception as e:
            logger.error(f"Error fetching calendar events: {e}")
            return "I'm having trouble accessing your calendar right now."

    @llm.ai_callable()
    async def create_calendar_event(
        self,
        summary: Annotated[str, llm.TypeInfo(description="The title of the event")],
        start_time: Annotated[str, llm.TypeInfo(description="Start time in IST (e.g., '2:30 PM')")],
        end_time: Annotated[str, llm.TypeInfo(description="End time in IST (e.g., '3:30 PM')")],
        date: Annotated[str, llm.TypeInfo(description="Date for the event (e.g., 'today', 'tomorrow', '2024-03-25' or '25-03-2024')")] = "today"
    ):
        """Create a new event in Google Calendar."""
        try:
            credentials = Credentials.from_authorized_user_file('token.json', ['https://www.googleapis.com/auth/calendar'])
            service = build('calendar', 'v3', credentials=credentials)

            ist = pytz.timezone('Asia/Kolkata')
            now = datetime.now(ist)

            # Get the target date
            if date.lower() == "today":
                target_date = now.date()
            elif date.lower() == "tomorrow":
                target_date = (now + timedelta(days=1)).date()
            else:
                try:
                    # Try parsing both date formats
                    try:
                        target_date = datetime.strptime(date, "%Y-%m-%d").date()
                    except ValueError:
                        target_date = datetime.strptime(date, "%d-%m-%Y").date()
                except ValueError:
                    return "Please provide the date in YYYY-MM-DD or DD-MM-YYYY format"

            try:
                start_dt = datetime.strptime(start_time, "%I:%M %p").replace(
                    year=target_date.year, month=target_date.month, day=target_date.day)
                end_dt = datetime.strptime(end_time, "%I:%M %p").replace(
                    year=target_date.year, month=target_date.month, day=target_date.day)

                start_dt = ist.localize(start_dt)
                end_dt = ist.localize(end_dt)

                if end_dt < start_dt:
                    end_dt += timedelta(days=1)
            except ValueError:
                return "Please provide the time in 12-hour format, like 2:30 PM"

            # Check if the event is in the past
            if start_dt < now:
                return "Sorry, I cannot schedule events in the past."

            event = {
                'summary': summary,
                'start': {
                    'dateTime': start_dt.isoformat(),
                    'timeZone': 'Asia/Kolkata',
                },
                'end': {
                    'dateTime': end_dt.isoformat(),
                    'timeZone': 'Asia/Kolkata',
                },
            }

            created_event = service.events().insert(calendarId='primary', body=event).execute()

            time_str = self.format_event_time(start_dt)
            date_str = self.format_date_for_speech(start_dt)
            return f"I've scheduled {summary} for {time_str} {date_str}."

        except Exception as e:
            logger.error(f"Error creating calendar event: {e}")
            return "I couldn't create that event. Please try again with a different time."

    ######################################
    # GMAIL TOOLS
    ######################################
    
    GMAIL_SCOPES = [
        'https://mail.google.com/',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.labels'
    ]

    def __init__(self):
        super().__init__()
        self.current_emails = {}  # Store email details for reference
        self.discussed_emails = set()  # Track which emails have been discussed

    def get_gmail_service(self):
        """Helper function to create authenticated Gmail service."""
        try:
            credentials = Credentials.from_authorized_user_file(
                'token.json', 
                self.GMAIL_SCOPES + [
                    'https://www.googleapis.com/auth/calendar',
                    'https://www.googleapis.com/auth/calendar.readonly'
                ]
            )
            return build('gmail', 'v1', credentials=credentials)
        except Exception as e:
            logger.error(f"Error creating Gmail service: {e}")
            raise

    @llm.ai_callable()
    async def get_email_details(
        self,
        email_number: Annotated[str, llm.TypeInfo(description="The number of the email to read")]
    ):
        """Get detailed content of a specific email and mark it as discussed."""
        try:
            if email_number not in self.current_emails:
                return "Email not found in current conversation."
                
            email_data = self.current_emails[email_number]
            service = self.get_gmail_service()

            # Mark this email as discussed
            self.discussed_emails.add(email_data['id'])

            # Get the label ID for "seen-by-lisa"
            labels = service.users().labels().list(userId='me').execute()
            lisa_label_id = next(
                (label['id'] for label in labels['labels'] if label['name'] == 'seen-by-lisa'),
                None
            )

            # Only label emails that are specifically discussed
            if lisa_label_id:
                service.users().messages().modify(
                    userId='me',
                    id=email_data['id'],
                    body={'addLabelIds': [lisa_label_id]}
                ).execute()

            return f"Email from {email_data['sender_name']} with subject '{email_data['subject']}'\n\nContent:\n{email_data['body']}"

        except Exception as e:
            logger.error(f"Error getting email details: {e}")
            return "Failed to get email details."

    @llm.ai_callable()
    async def get_email_summary(
        self,
        max_results: Annotated[
            int, llm.TypeInfo(description="Maximum number of emails to fetch")
        ] = 5,
        search_query: Annotated[
            str, llm.TypeInfo(description="Optional search query to filter emails")
        ] = None
    ):
        """Get a summary of recent emails including unread and important messages."""
        try:
            service = self.get_gmail_service()
            
            # Clear previous email cache and discussed emails
            self.current_emails.clear()
            self.discussed_emails.clear()
            
            # Get unread emails count first
            unread_results = service.users().messages().list(
                userId='me',
                q='is:unread',
                maxResults=1
            ).execute()
            unread_count = len(unread_results.get('messages', []))
            
            # Build search query
            query = search_query if search_query else ''
            
            # Get recent emails - fetch more but show less
            results = service.users().messages().list(
                userId='me',
                maxResults=25,  # Fetch last 25 emails
                q=query  # Include search query if provided
            ).execute()
            messages = results.get('messages', [])

            if not messages:
                return "No emails found matching your criteria."

            # Process only the first max_results for display
            display_messages = messages[:max_results]
            
            email_details = []
            # Store all messages in cache but only show max_results
            for i, msg in enumerate(messages):
                try:
                    message = service.users().messages().get(
                        userId='me', 
                        id=msg['id'],
                        format='full'
                    ).execute()

                    headers = message['payload']['headers']
                    subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No subject')
                    sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown sender')
                    sender_name = sender.split('<')[0].strip()
                    sender_email = sender.split('<')[1].strip('>') if '<' in sender else sender
                    
                    # Extract email body
                    body = ""
                    if 'parts' in message['payload']:
                        for part in message['payload']['parts']:
                            if part['mimeType'] == 'text/plain':
                                body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                                break
                    elif 'body' in message['payload'] and 'data' in message['payload']['body']:
                        body = base64.urlsafe_b64decode(message['payload']['body']['data']).decode('utf-8')

                    # Store all emails in cache with their index
                    self.current_emails[str(i + 1)] = {
                        'id': msg['id'],
                        'sender_name': sender_name,
                        'sender_email': sender_email,
                        'subject': subject,
                        'body': body
                    }
                    
                    # Only add to display list if it's within max_results
                    if msg['id'] in [m['id'] for m in display_messages]:
                        email_details.append({
                            'number': len(email_details) + 1,
                            'sender': sender_name,
                            'subject': subject
                        })

                except Exception as e:
                    logger.error(f"Error fetching email details: {e}")
                    continue

            if not email_details:
                return "I can see your emails but couldn't read their details. Please try again."

            # Construct response based on whether this was a search or regular summary
            if search_query:
                summary = f"Found {len(messages)} emails matching your search. Here are the most recent {len(email_details)}:\n"
            else:
                summary = f"You have {unread_count} unread emails. Here are your {len(email_details)} most recent messages:\n"
            
            for email in email_details:
                summary += f"\n{email['number']}. From {email['sender']} about '{email['subject']}'"
            
            summary += "\n\nYou can ask me to read any email by saying 'read email number [1-5]'"
            if search_query:
                summary += f"\nI've actually searched through your last 25 emails to find these results."

            return summary

        except Exception as e:
            logger.error(f"Error accessing Gmail: {e}")
            return "I'm having trouble accessing your Gmail right now. Please make sure I have the correct permissions."

    @llm.ai_callable()
    async def create_draft(
        self,
        to: Annotated[str, llm.TypeInfo(description="Email address of the recipient")],
        subject: Annotated[str, llm.TypeInfo(description="Subject of the email")],
        body: Annotated[str, llm.TypeInfo(description="Content of the email")]
    ):
        """Create a new draft email."""
        try:
            service = self.get_gmail_service()
            
            # Check if user referred to a sender by name or number
            if to.isdigit() and to in self.current_emails:
                to = self.current_emails[to]['sender_email']
            elif not '@' in to and self.current_emails:
                # Try to find sender by name
                for email in self.current_emails.values():
                    if to.lower() in email['sender_name'].lower():
                        to = email['sender_email']
                        break
            
            # Basic email validation
            if not '@' in to:
                return "Please provide a valid email address with @ symbol."
            
            # Create message container
            message = MIMEText(body, 'plain', 'utf-8')
            message['to'] = to
            message['from'] = 'me'  # Gmail API requires this
            message['subject'] = subject

            # Properly encode the message
            raw_message = base64.urlsafe_b64encode(
                message.as_string().encode('utf-8')
            ).decode('utf-8')

            try:
                draft = service.users().drafts().create(
                    userId='me',
                    body={
                        'message': {
                            'raw': raw_message
                        }
                    }
                ).execute()

                recipient_name = to.split('@')[0]
                return f"I've saved your email to {recipient_name} as a draft. You can review and send it from your Gmail."

            except Exception as e:
                if 'Invalid To header' in str(e):
                    return f"The email address '{to}' appears to be invalid. Please provide a valid email address."
                raise

        except Exception as e:
            logger.error(f"Error creating draft: {e}")
            return "I couldn't create the draft email. Please try again with a valid email address."
