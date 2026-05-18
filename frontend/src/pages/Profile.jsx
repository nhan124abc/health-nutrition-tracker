import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const initialProfile = {
  gender: '',
  birthDate: '',
  height: '',
  weight: '',
  activityLevel: '',
};

function getBmiStatus(bmi) {
  if (bmi < 18.5) {
    return {
      labelKey: 'profile.underweight',
      messageKey: 'profile.underweightMessage',
      variant: 'warning',
    };
  }

  if (bmi < 25) {
    return {
      labelKey: 'profile.normal',
      messageKey: 'profile.normalMessage',
      variant: 'success',
    };
  }

  if (bmi < 30) {
    return {
      labelKey: 'profile.overweight',
      messageKey: 'profile.overweightMessage',
      variant: 'warning',
    };
  }

  return {
    labelKey: 'profile.obese',
    messageKey: 'profile.obeseMessage',
    variant: 'warning',
  };
}

function Profile() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(initialProfile);
  const [validated, setValidated] = useState(false);

  const heightValue = Number(profile.height);
  const weightValue = Number(profile.weight);

  const errors = {
    gender: !profile.gender,
    birthDate: !profile.birthDate,
    height: profile.height === '' || heightValue <= 0,
    weight: profile.weight === '' || weightValue <= 0,
    activityLevel: !profile.activityLevel,
  };

  const bmiResult = useMemo(() => {
    if (errors.height || errors.weight) {
      return null;
    }

    const heightInMeters = heightValue / 100;
    const bmi = weightValue / (heightInMeters * heightInMeters);
    const roundedBmi = Number(bmi.toFixed(1));

    return {
      value: roundedBmi,
      ...getBmiStatus(roundedBmi),
    };
  }, [errors.height, errors.weight, heightValue, weightValue]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const shouldShowInvalid = (fieldName) => validated && errors[fieldName];

  const handleSubmit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setValidated(true);
  };

  return (
    <>
      <div className="mb-4">
        <Badge bg="success" className="mb-2">
          {t('profile.title')}
        </Badge>
        <h1 className="h2 fw-bold mb-1">{t('profile.title')}</h1>
        <p className="text-secondary mb-0">{t('profile.subtitle')}</p>
      </div>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <Form noValidate validated={validated} onSubmit={handleSubmit}>
                <Row className="g-3">
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">{t('profile.gender')}</Form.Label>
                      <div className="d-flex flex-wrap gap-3">
                        <Form.Check
                          required
                          type="radio"
                          id="gender-male"
                          name="gender"
                          label={t('profile.male')}
                          value="male"
                          checked={profile.gender === 'male'}
                          onChange={handleChange}
                          isInvalid={shouldShowInvalid('gender')}
                        />
                        <Form.Check
                          required
                          type="radio"
                          id="gender-female"
                          name="gender"
                          label={t('profile.female')}
                          value="female"
                          checked={profile.gender === 'female'}
                          onChange={handleChange}
                          isInvalid={shouldShowInvalid('gender')}
                        />
                        <Form.Check
                          required
                          type="radio"
                          id="gender-other"
                          name="gender"
                          label={t('profile.other')}
                          value="other"
                          checked={profile.gender === 'other'}
                          onChange={handleChange}
                          isInvalid={shouldShowInvalid('gender')}
                        />
                      </div>
                      {shouldShowInvalid('gender') && (
                        <div className="invalid-feedback d-block">{t('profile.validationGender')}</div>
                      )}
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="birthDate">
                      <Form.Label>{t('profile.birthDate')}</Form.Label>
                      <Form.Control
                        required
                        type="date"
                        name="birthDate"
                        value={profile.birthDate}
                        onChange={handleChange}
                        isInvalid={shouldShowInvalid('birthDate')}
                      />
                      <Form.Control.Feedback type="invalid">{t('profile.validationBirthDate')}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="activityLevel">
                      <Form.Label>{t('profile.activityLevel')}</Form.Label>
                      <Form.Select
                        required
                        name="activityLevel"
                        value={profile.activityLevel}
                        onChange={handleChange}
                        isInvalid={shouldShowInvalid('activityLevel')}
                      >
                        <option value="">{t('profile.selectActivity')}</option>
                        <option value="sedentary">{t('profile.sedentary')}</option>
                        <option value="light">{t('profile.light')}</option>
                        <option value="moderate">{t('profile.moderate')}</option>
                        <option value="active">{t('profile.active')}</option>
                        <option value="very-active">{t('profile.veryActive')}</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">{t('profile.validationActivity')}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="height">
                      <Form.Label>{t('profile.height')}</Form.Label>
                      <Form.Control
                        required
                        min="1"
                        type="number"
                        name="height"
                        value={profile.height}
                        onChange={handleChange}
                        placeholder={t('profile.heightPlaceholder')}
                        isInvalid={shouldShowInvalid('height')}
                      />
                      <Form.Control.Feedback type="invalid">
                        {t('profile.validationHeight')}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="weight">
                      <Form.Label>{t('profile.weight')}</Form.Label>
                      <Form.Control
                        required
                        min="1"
                        type="number"
                        name="weight"
                        value={profile.weight}
                        onChange={handleChange}
                        placeholder={t('profile.weightPlaceholder')}
                        isInvalid={shouldShowInvalid('weight')}
                      />
                      <Form.Control.Feedback type="invalid">
                        {t('profile.validationWeight')}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col xs={12} className="d-flex justify-content-end">
                    <Button variant="success" type="submit">
                      {t('buttons.save')}
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Alert variant={bmiResult?.variant || 'warning'} className="health-result-alert shadow-sm">
            <Alert.Heading className="h5">{t('profile.resultTitle')}</Alert.Heading>
            {bmiResult ? (
              <>
                <div className="health-result-value">{bmiResult.value}</div>
                <p className="mb-2">
                  {t('profile.status')}: <strong>{t(bmiResult.labelKey)}</strong>
                </p>
                <p className="mb-0">{t(bmiResult.messageKey)}</p>
              </>
            ) : (
              <p className="mb-0">
                {t('profile.resultEmpty')}
              </p>
            )}
          </Alert>
        </Col>
      </Row>
    </>
  );
}

export default Profile;
