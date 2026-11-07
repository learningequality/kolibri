package org.learningequality.Kolibri.discovery;

import java.io.ByteArrayOutputStream;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.BufferUnderflowException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

final class MdnsMessage {

  static final int TYPE_A = 1;
  static final int TYPE_PTR = 12;
  static final int TYPE_TXT = 16;
  static final int TYPE_SRV = 33;

  private static final int CLASS_IN = 1;
  private static final int FLAG_RESPONSE = 0x8000;
  private static final int POINTER_MASK = 0xc0;

  static final class Question {
    private final String name;
    private final int type;

    Question(String name, int type) {
      this.name = name;
      this.type = type;
    }

    String getName() {
      return name;
    }

    int getType() {
      return type;
    }
  }

  static final class Record {
    private final String name;
    private final int type;
    private final String target;
    private final int port;
    private final String address;
    private final Map<String, String> txt;

    private Record(
        String name, int type, String target, int port, String address, Map<String, String> txt) {
      this.name = name;
      this.type = type;
      this.target = target;
      this.port = port;
      this.address = address;
      this.txt = txt;
    }

    String getName() {
      return name;
    }

    int getType() {
      return type;
    }

    /** The PTR or SRV target name; null for other types. */
    String getTarget() {
      return target;
    }

    /** The SRV port; 0 for other types. */
    int getPort() {
      return port;
    }

    /** The A record's dotted IPv4 address; null for other types. */
    String getAddress() {
      return address;
    }

    /** The TXT entries; empty for other types. */
    Map<String, String> getTxt() {
      return txt;
    }
  }

  private final boolean response;
  private final List<Question> questions;
  private final List<Record> records;

  private MdnsMessage(boolean response, List<Question> questions, List<Record> records) {
    this.response = response;
    this.questions = questions;
    this.records = records;
  }

  static byte[] query(String name, int... types) {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    writeShort(out, 0);
    writeShort(out, 0);
    writeShort(out, types.length);
    writeShort(out, 0);
    writeShort(out, 0);
    writeShort(out, 0);
    for (int type : types) {
      writeName(out, name);
      writeShort(out, type);
      writeShort(out, CLASS_IN);
    }
    return out.toByteArray();
  }

  private static void writeShort(ByteArrayOutputStream out, int value) {
    out.write(value >> 8);
    out.write(value);
  }

  private static void writeName(ByteArrayOutputStream out, String name) {
    for (String label : name.split("\\.")) {
      byte[] bytes = label.getBytes(StandardCharsets.UTF_8);
      out.write(bytes.length);
      out.write(bytes, 0, bytes.length);
    }
    out.write(0);
  }

  /**
   * @throws IllegalArgumentException when the bytes are not a well-formed DNS message
   */
  static MdnsMessage parse(byte[] data, int length) {
    try {
      return new Reader(ByteBuffer.wrap(data, 0, length)).read();
    } catch (BufferUnderflowException | IndexOutOfBoundsException e) {
      throw new IllegalArgumentException("Truncated DNS message", e);
    }
  }

  private static final class Reader {
    private final ByteBuffer buffer;

    Reader(ByteBuffer buffer) {
      this.buffer = buffer;
    }

    MdnsMessage read() {
      buffer.getShort();
      boolean response = (buffer.getShort() & FLAG_RESPONSE) != 0;
      int questionCount = unsignedShort();
      int recordCount = unsignedShort() + unsignedShort() + unsignedShort();

      List<Question> questions = new ArrayList<>();
      for (int i = 0; i < questionCount; i++) {
        questions.add(new Question(readName(), unsignedShort()));
        buffer.getShort();
      }
      List<Record> records = new ArrayList<>();
      for (int i = 0; i < recordCount; i++) {
        records.add(readRecord());
      }
      return new MdnsMessage(response, questions, records);
    }

    private Record readRecord() {
      String name = readName();
      int type = unsignedShort();
      buffer.getShort();
      buffer.getInt();
      int dataLength = unsignedShort();
      int end = buffer.position() + dataLength;
      String target = null;
      int port = 0;
      String address = null;
      Map<String, String> txt = Collections.emptyMap();
      switch (type) {
        case TYPE_PTR:
          target = readName();
          break;
        case TYPE_SRV:
          buffer.getShort();
          buffer.getShort();
          port = unsignedShort();
          target = readName();
          break;
        case TYPE_A:
          address = readAddress();
          break;
        case TYPE_TXT:
          txt = readTxt(end);
          break;
        default:
          break;
      }
      Record record = new Record(name, type, target, port, address, txt);
      buffer.position(end);
      return record;
    }

    private String readAddress() {
      byte[] address = new byte[4];
      buffer.get(address);
      try {
        return InetAddress.getByAddress(address).getHostAddress();
      } catch (UnknownHostException e) {
        throw new IllegalStateException(e);
      }
    }

    private Map<String, String> readTxt(int end) {
      Map<String, String> txt = new HashMap<>();
      while (buffer.position() < end) {
        String entry = readString();
        int separator = entry.indexOf('=');
        if (separator > 0) {
          txt.put(entry.substring(0, separator), entry.substring(separator + 1));
        }
      }
      return txt;
    }

    private String readName() {
      StringBuilder name = new StringBuilder();
      int position = buffer.position();
      int resumeAt = -1;
      int limit = position;
      while (true) {
        int length = buffer.get(position) & 0xff;
        if ((length & POINTER_MASK) == POINTER_MASK) {
          int target = ((length & ~POINTER_MASK) << 8) | (buffer.get(position + 1) & 0xff);
          if (target >= limit) {
            throw new IllegalArgumentException("DNS name pointer does not point backwards");
          }
          if (resumeAt < 0) {
            resumeAt = position + 2;
          }
          position = target;
          limit = target;
        } else if (length == 0) {
          buffer.position(resumeAt < 0 ? position + 1 : resumeAt);
          return name.toString();
        } else {
          buffer.position(position);
          name.append(readString()).append('.');
          position = buffer.position();
        }
      }
    }

    private String readString() {
      int length = buffer.get() & 0xff;
      byte[] bytes = new byte[length];
      buffer.get(bytes);
      return new String(bytes, StandardCharsets.UTF_8);
    }

    private int unsignedShort() {
      return buffer.getShort() & 0xffff;
    }
  }

  boolean isResponse() {
    return response;
  }

  List<Question> getQuestions() {
    return questions;
  }

  /** Answer, authority and additional records, in packet order. */
  List<Record> getRecords() {
    return records;
  }
}
