import { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
//import serviceAccount from "../../lib/serviceAccountKey.json";
import {
  MediaConvertClient,
  CreateJobCommand,
} from "@aws-sdk/client-mediaconvert";
import Mixpanel from "mixpanel";

const mixpanel = Mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "");

const ENDPOINT = {
  endpoint: "https://mqm13wgra.mediaconvert.us-east-2.amazonaws.com",
  region: "us-east-2",
};

const mediaConvert = new MediaConvertClient(ENDPOINT);

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_KEY as string);

if (!admin.apps.length)
  admin.initializeApp({
    /* @ts-ignore */
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://guestography-37df8.firebaseio.com",
  });
else admin.app();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { eventId } = req.query;
  const { secret } = JSON.parse(req.body || {});

  // Verify secret
  if (secret !== process.env.WEBHOOK_SECRET) {
    console.error("Invalid webhook secret");
    res.status(401).send("Invalid webhook secret");
    return;
  }

  const db = admin.firestore();
  // Retrieve interview records (excluding a previously generated interview in the case of a rerun)
  const interviews = await (
    await db.collection(`events/${eventId}/interviews`).get()
  ).docs
    .filter((doc) => doc.id !== "interview")
    .map((doc) => doc.data());

  const params = {
    // Queue: "JOB_QUEUE_ARN",
    Role: "arn:aws:iam::177450493151:role/service-role/MediaConvert_Default_Role",
    Settings: {
      OutputGroups: [
        {
          Name: "File Group",
          OutputGroupSettings: {
            Type: "FILE_GROUP_SETTINGS",
            FileGroupSettings: {
              Destination: `s3://${process.env.S3_BUCKET}/events/${eventId}/`,
            },
          },
          Outputs: [
            {
              VideoDescription: {
                ScalingBehavior: "DEFAULT",
                TimecodeInsertion: "DISABLED",
                AntiAlias: "ENABLED",
                Sharpness: 50,
                CodecSettings: {
                  Codec: "H_264",
                  H264Settings: {
                    InterlaceMode: "PROGRESSIVE",
                    NumberReferenceFrames: 3,
                    Syntax: "DEFAULT",
                    Softness: 0,
                    GopClosedCadence: 1,
                    GopSize: 90,
                    Slices: 1,
                    GopBReference: "DISABLED",
                    SlowPal: "DISABLED",
                    SpatialAdaptiveQuantization: "ENABLED",
                    TemporalAdaptiveQuantization: "ENABLED",
                    FlickerAdaptiveQuantization: "DISABLED",
                    EntropyEncoding: "CABAC",
                    Bitrate: 5000000,
                    FramerateControl: "SPECIFIED",
                    RateControlMode: "CBR",
                    CodecProfile: "MAIN",
                    Telecine: "NONE",
                    MinIInterval: 0,
                    AdaptiveQuantization: "HIGH",
                    CodecLevel: "AUTO",
                    FieldEncoding: "PAFF",
                    SceneChangeDetect: "ENABLED",
                    QualityTuningLevel: "SINGLE_PASS",
                    FramerateConversionAlgorithm: "DUPLICATE_DROP",
                    UnregisteredSeiTimecode: "DISABLED",
                    GopSizeUnits: "FRAMES",
                    ParControl: "SPECIFIED",
                    NumberBFramesBetweenReferenceFrames: 2,
                    RepeatPps: "DISABLED",
                    FramerateNumerator: 30,
                    FramerateDenominator: 1,
                    ParNumerator: 1,
                    ParDenominator: 1,
                  },
                },
                AfdSignaling: "NONE",
                DropFrameTimecode: "ENABLED",
                RespondToAfd: "NONE",
                ColorMetadata: "INSERT",
              },
              AudioDescriptions: [
                {
                  AudioTypeControl: "FOLLOW_INPUT",
                  CodecSettings: {
                    Codec: "AAC",
                    AacSettings: {
                      AudioDescriptionBroadcasterMix: "NORMAL",
                      RateControlMode: "CBR",
                      CodecProfile: "LC",
                      CodingMode: "CODING_MODE_2_0",
                      RawFormat: "NONE",
                      SampleRate: 48000,
                      Specification: "MPEG4",
                      Bitrate: 64000,
                    },
                  },
                  LanguageCodeControl: "FOLLOW_INPUT",
                  AudioSourceName: "Audio Selector 1",
                },
              ],
              ContainerSettings: {
                Container: "MP4",
                Mp4Settings: {
                  CslgAtom: "INCLUDE",
                  FreeSpaceBox: "EXCLUDE",
                  MoovPlacement: "PROGRESSIVE_DOWNLOAD",
                },
              },
              NameModifier: "-interview",
            },
          ],
        },
      ],
      AdAvailOffset: 0,
      Inputs: interviews.map((interview) => {
        return {
          AudioSelectors: {
            "Audio Selector 1": {
              Offset: 0,
              DefaultSelection: "NOT_DEFAULT",
              ProgramSelection: 1,
              SelectorType: "TRACK",
            },
          },
          VideoSelector: {
            ColorSpace: "FOLLOW",
            Rotate: "AUTO",
          },
          FilterEnable: "AUTO",
          PsiControl: "USE_PSI",
          FilterStrength: 0,
          DeblockFilter: "DISABLED",
          DenoiseFilter: "DISABLED",
          TimecodeSource: "EMBEDDED",
          FileInput: interview.publicUrl,
        };
      }),
      TimecodeConfig: {
        Source: "EMBEDDED",
      },
    },
  };

  try {
    const data = await mediaConvert.send(new CreateJobCommand(params));
    mixpanel.track("Interview generation job created", {
      eventId,
      jobId: data.Job?.Arn,
    });
    res.status(200).send("okay");
  } catch (error) {
    console.error("Failed to create MediaConvert job", error);
    throw error;
  }
}
