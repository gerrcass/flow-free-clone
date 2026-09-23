import type { Settings } from '../game/progress';

interface SettingsControlsProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

/** Sound/animation toggles shared by the Welcome Screen and Level select. */
export default function SettingsControls({ settings, onChange }: SettingsControlsProps) {
  return (
    <fieldset className="settings">
      <legend>Settings</legend>
      <label>
        <input
          type="checkbox"
          checked={settings.sound}
          onChange={(e) => onChange({ ...settings, sound: e.target.checked })}
        />{' '}
        Sound
      </label>
      {/* Win-overlay motion only; the Welcome hero is static by design. */}
      <label>
        <input
          type="checkbox"
          checked={settings.animation}
          onChange={(e) => onChange({ ...settings, animation: e.target.checked })}
        />{' '}
        Win animation
      </label>
    </fieldset>
  );
}
