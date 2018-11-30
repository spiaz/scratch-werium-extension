String readed = "0";
bool ledOn = false;

// the setup routine runs once when you press reset:
void setup()
{
  // initialize serial communication at 57600 bits per second:
  Serial.begin(57600);
  // initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);
}

String myrand()
{
  return String(random(-100, 101) / 100.0);
}

// the loop routine runs over and over again forever:
void loop()
{
  if (Serial.available())
  {
    readed = Serial.readString();
    digitalWrite(LED_BUILTIN, LOW);
    ledOn = false;
  }

  if (readed.equals("#om"))
  {
    if (ledOn)
    {
      digitalWrite(LED_BUILTIN, HIGH);
    }
    else
    {
      digitalWrite(LED_BUILTIN, LOW);
    }
    ledOn = ledOn ^ true;

    // print out the value you read:
    Serial.println("#matrix=" + myrand() + "," + myrand() + "," + myrand() + "," + myrand() + "," + myrand() + "," + myrand() + "," + myrand() + "," + myrand() + "," + myrand() + "," + String(random(0, 10000000)));
  }

  delay(10); // delay in between reads for stability
}
