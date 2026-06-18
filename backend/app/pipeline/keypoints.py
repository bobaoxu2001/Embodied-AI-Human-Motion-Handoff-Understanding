"""MediaPipe keypoint-extraction wrapper with a graceful fallback.

If `mediapipe` is installed this exposes a real 2D body+hand keypoint extractor;
if not, `KeypointExtractor.available` is False and callers fall back to demo
keypoints. Importing this module never fails just because MediaPipe is missing.
"""

from typing import List, Optional

from ..runtime import has_mediapipe


class KeypointExtractor:
    """Thin wrapper around MediaPipe Pose + Hands.

    Usage:
        kp = KeypointExtractor()
        if kp.available:
            body, hands = kp.extract(rgb_frame)  # numpy HxWx3
    """

    def __init__(self) -> None:
        self.available = has_mediapipe()
        self._pose = None
        self._hands = None
        if self.available:
            try:
                import mediapipe as mp  # type: ignore

                self._mp = mp
                self._pose = mp.solutions.pose.Pose(
                    static_image_mode=False, model_complexity=1
                )
                self._hands = mp.solutions.hands.Hands(
                    static_image_mode=False, max_num_hands=2
                )
            except Exception:
                # Library present but failed to initialize (e.g. no model assets).
                self.available = False

    def extract(self, rgb_frame) -> "tuple[List[List[float]], Optional[List[List[float]]]]":
        """Return (body_keypoints, hand_keypoints) as normalized [x, y, score].

        Raises RuntimeError when MediaPipe is unavailable — guard with
        `self.available` first and use demo keypoints otherwise.
        """
        if not self.available:
            raise RuntimeError(
                "MediaPipe is not available; use demo keypoints instead."
            )
        pose_res = self._pose.process(rgb_frame)
        body: List[List[float]] = []
        if pose_res.pose_landmarks:
            for lm in pose_res.pose_landmarks.landmark[:17]:
                body.append([lm.x, lm.y, lm.visibility])

        hands_res = self._hands.process(rgb_frame)
        hand: Optional[List[List[float]]] = None
        if hands_res.multi_hand_landmarks:
            hand = [
                [lm.x, lm.y, 1.0]
                for lm in hands_res.multi_hand_landmarks[0].landmark
            ]
        return body, hand

    def close(self) -> None:
        for h in (self._pose, self._hands):
            if h is not None:
                try:
                    h.close()
                except Exception:
                    pass
