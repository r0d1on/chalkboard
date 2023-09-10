FROM ubuntu:18.04

RUN apt -y update && \
apt -y install python3.8 wget gnupg && \
update-alternatives --install /usr/bin/python python /usr/bin/python3.8 10

RUN apt -y install python3-pip && \
python -m pip install --upgrade pip

ARG CHROME_VERSION="114.0.5735.90-1"

RUN wget --no-verbose -O /tmp/chrome.deb https://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/google-chrome-stable_${CHROME_VERSION}_amd64.deb && \
apt install -y /tmp/chrome.deb && \
rm /tmp/chrome.deb

#RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
#sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' && \
#apt -y install google-chrome-stable && \

RUN apt -y install imagemagick && \
sed -i -E 's/name="memory" value=".+"/name="memory" value="2GiB"/g' /etc/ImageMagick-6/policy.xml && \
sed -i -E 's/name="map" value=".+"/name="map" value="1GiB"/g' /etc/ImageMagick-6/policy.xml && \
sed -i -E 's/name="area" value=".+"/name="area" value="2GiB"/g' /etc/ImageMagick-6/policy.xml && \
sed -i -E 's/name="disk" value=".+"/name="disk" value="2GiB"/g' /etc/ImageMagick-6/policy.xml

RUN pip install --no-cache-dir selenium webdriver-manager imageio

COPY ./*.py /opt
COPY ./*.sh /opt

WORKDIR /opt

RUN python3.8 ./init.py
ENV DISPLAY=:99

ENTRYPOINT ["python3.8"]
CMD ["play.py", "?"]
