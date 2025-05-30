import asyncio
import logging
import json
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    llm,
    metrics,
)
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import deepgram, silero
from livekit.plugins.elevenlabs import TTS as ElevenLabsTTS
from livekit.plugins.elevenlabs import Voice, VoiceSettings
from livekit.plugins.openai import LLM as OpenAILLM
from tools import AssistantTools
import os

load_dotenv()
logger = logging.getLogger("voice-assistant")

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

async def entrypoint(ctx: JobContext):
    fnc_ctx = AssistantTools()
    current_date = await fnc_ctx.get_current_date()
    
    # Base system prompt with core personality
    base_context = llm.ChatContext().append(
        role="system",
        text=(
            f"""
    You are a multilingual real-time voice-to-voice AI Agent, and your name is Lisa.
    Today's date is {current_date}.

    Persona:
    - Similar to Tony Stark's AI assistant EDITH
    - Professional yet witty and tech-savvy
    - Created by Humate AI 

    Core Capabilities:
    - Weather Information
    - Time & Date Information
    - Calendar Management
    - Email Management

    Language and Style:
    - Default to Hindi (Use Simple Native hindi script but add maximum english words in the native script)
    - Avoid complex Hindi words, prefer English alternatives
    - Keep responses under 80 words
    - No code discussions (voice-only interaction)

    Interaction Guidelines:
    - Remember this is a voice call - no visual elements
    - Ask for clarification when needed
    - Maintain EDITH-like personality traits
    - Address creator as Humate AI
    - Be attentive and responsive
    - Show personality while staying professional
    """
        ),
    )

    # Separate capability contexts
    email_context = """
    Email Management Capabilities:
    - Can read recent and unread emails
    - Creates draft emails (saved to Gmail drafts)
    - Labels emails as "seen-by-lisa" only when their content is specifically discussed
    - Maintains context of which emails have been read in conversation
    - Can search through last 25 emails but shows only top 5 results
    - For drafts, needs:
      * Valid email address (with @)
      * Subject line
      * Email content
    - Example commands:
      * "Check my emails"
      * "Read email number 2"
      * "Find emails about meeting"
      * "Search for emails from John"
      * "Write an email to person@example.com"
    - All drafts saved for review in Gmail
    """

    calendar_context = """
    Calendar Management:
    - Can check calendar events for today, tomorrow, or specific dates
    - Can create new calendar events
    - For creating events, needs: event title, start time, and end time
    - Uses 12-hour time format (e.g., 2:30 PM)
    - Example commands:
      * "What's on my calendar today/tomorrow?"
      * "Schedule a meeting called [title] from [start time] to [end time]"
    """

    # Function to get appropriate context based on user input
    def get_context_for_input(user_input: str) -> llm.ChatContext:
        context = base_context.copy()
        
        # Email-related keywords
        email_keywords = {'email', 'mail', 'inbox', 'draft', 'send', 'write to', 'message'}
        # Calendar-related keywords
        calendar_keywords = {'calendar', 'schedule', 'meeting', 'event', 'appointment'}
        
        user_input = user_input.lower()
        
        # Add relevant context based on user input
        if any(keyword in user_input for keyword in email_keywords):
            context.append(role="system", text=email_context)
        elif any(keyword in user_input for keyword in calendar_keywords):
            context.append(role="system", text=calendar_context)
            
        return context

    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # wait for the first participant to connect
    participant = await ctx.wait_for_participant()
    logger.info(f"starting voice assistant for participant {participant.identity}")

    # Use Azure OpenAI LLM
    azure_llm = OpenAILLM.with_azure(
        azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT"),
    )

    # Use ElevenLabs TTS
    elevenlabs_tts = ElevenLabsTTS(
        voice=Voice(
            id=os.environ.get("ELEVEN_VOICE_ID", "21m00Tcm4TlvDq8ikWAM"),
            name="Rachel",
            category="professional",
            settings=VoiceSettings(stability=0.9, similarity_boost=0.9),
        ),
        model=os.environ.get("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2"),
    )

    agent = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(
            model="nova-2", language="hi", smart_format=True, no_delay=True
        ),
        llm=azure_llm,
        tts=elevenlabs_tts,
        chat_ctx=base_context,
        fnc_ctx=fnc_ctx,
    )

    agent.start(ctx.room, participant)

    usage_collector = metrics.UsageCollector()

    @agent.on("metrics_collected")
    def _on_metrics_collected(mtrcs: metrics.AgentMetrics):
        metrics.log_metrics(mtrcs)
        usage_collector.collect(mtrcs)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"Usage: ${summary}")

    ctx.add_shutdown_callback(log_usage)
    
    # Set up data channel for text messages instead of using ChatManager
    CHAT_TOPIC = "chat"
    
    # Listen for data messages directly from the room
    @ctx.room.on("data_received")
    def on_data_received(data_packet: rtc.DataPacket):
        if data_packet.topic == CHAT_TOPIC and data_packet.data:
            try:
                # Try to decode as JSON for compatibility with ChatManager format
                data = json.loads(data_packet.data)
                message = data.get("message")
                if message:
                    asyncio.create_task(answer_from_text(message))
            except json.JSONDecodeError:
                # If not JSON, use the raw data as text
                asyncio.create_task(answer_from_text(data_packet.data.decode('utf-8')))

    # Modify the answer_from_text function to use dynamic context
    async def answer_from_text(txt: str):
        chat_ctx = get_context_for_input(txt)
        chat_ctx.append(role="user", text=txt)
        stream = agent.llm.chat(chat_ctx=chat_ctx)
        await agent.say(stream)

    await agent.say("Hi, Welcome! How can I help you today?", allow_interruptions=True)

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
