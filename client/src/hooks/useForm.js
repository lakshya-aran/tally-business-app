import { useState, useCallback } from 'react';

/**
 * Minimal form state + validation.
 * `validate(values)` returns an object of { field: message } for invalid fields.
 * Server-side field errors (422 details) can be merged via setErrors.
 */
export function useForm(initialValues, validate = () => ({})) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const onChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      const v = type === 'checkbox' ? checked : value;
      setValues((prev) => {
        const next = { ...prev, [name]: v };
        // Re-validate a field the user has already been told about.
        if (touched[name]) setErrors((errs) => ({ ...errs, [name]: validate(next)[name] }));
        return next;
      });
    },
    [touched, validate]
  );

  const onBlur = useCallback(
    (e) => {
      const { name } = e.target;
      setTouched((t) => ({ ...t, [name]: true }));
      setErrors((errs) => ({ ...errs, [name]: validate(values)[name] }));
    },
    [validate, values]
  );

  /** Wraps a submit handler: validates everything first. */
  const handleSubmit = (fn) => async (e) => {
    e?.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])));
    if (Object.values(errs).some(Boolean)) return;
    await fn(values);
  };

  const field = (name) => ({ name, value: values[name] ?? '', onChange, onBlur, error: errors[name] });

  return { values, setValues, errors, setErrors, field, handleSubmit, reset: () => setValues(initialValues) };
}
